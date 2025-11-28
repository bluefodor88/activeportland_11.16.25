import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'

interface ChatPreview {
  id: string
  name: string
  lastMessage: string
  timestamp: Date
  unreadCount: number
  avatar: string
  otherUserId: string
}

export function useChats() {
  const { user } = useAuth()
  const [chats, setChats] = useState<ChatPreview[]>([])
  const [loading, setLoading] = useState(true)

  const fetchChats = async () => {
    if (!user) return

    try {
      const { data: chatsData, error: chatsError } = await supabase
        .from('chats')
        .select('*')
        .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
        .order('last_message_at', { ascending: false })

      if (chatsError) {
        console.error('Error fetching chats:', chatsError)
        setChats([])
        return
      }

      if (!chatsData || chatsData.length === 0) {
        setChats([])
        return
      }

      const chatPreviews = await Promise.all(
        chatsData.map(async (chat) => {
          const otherUserId = chat.participant_1 === user.id ? chat.participant_2 : chat.participant_1

          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', otherUserId)
            .single()

          const { data: lastMessageData } = await supabase
            .from('chat_messages')
            .select('message, created_at')
            .eq('chat_id', chat.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          // Get unread count (messages sent by other user after user's last seen)
          // For now, we'll use a simple heuristic: messages from the last hour that aren't from current user
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
          const { count: unreadCount } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('chat_id', chat.id)
            .neq('sender_id', user.id)
            .gte('created_at', oneHourAgo)

          return {
            id: chat.id,
            name: profileData?.name || 'Unknown User',
            lastMessage: lastMessageData?.message || 'No messages yet',
            timestamp: new Date(lastMessageData?.created_at || chat.created_at),
            unreadCount: unreadCount || 0,
            avatar: profileData?.avatar_url ?? null,
            otherUserId: otherUserId
          }
        })
      )

      setChats(chatPreviews)
    } catch (error) {
      console.error('Error fetching chats:', error)
      setChats([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchChats()
    }
  }, [user, fetchChats])

  return { chats, loading, refetch: fetchChats }
}

// Simple function to get or create a chat - exported separately
export async function getOrCreateChat(currentUserId: string, otherUserId: string): Promise<string | null> {
  try {
    // Step 1: Look for existing chat
    const { data: existingChats, error: searchError } = await supabase
      .from('chats')
      .select('id')
      .or(`and(participant_1.eq.${currentUserId},participant_2.eq.${otherUserId}),and(participant_1.eq.${otherUserId},participant_2.eq.${currentUserId})`)
      .limit(1)

    if (searchError) {
      console.error('Error searching for chat:', searchError)
      return null
    }

    if (existingChats && existingChats.length > 0) {
      return existingChats[0].id
    }

    // Step 2: Create new chat
    const { data: newChat, error: createError } = await supabase
      .from('chats')
      .insert({
        participant_1: currentUserId,
        participant_2: otherUserId,
      })
      .select('id')
      .single()

    if (createError) {
      console.error('Error creating chat:', createError)
      return null
    }

    return newChat?.id || null
  } catch (error) {
    console.error('Error in getOrCreateChat:', error)
    return null
  }
}