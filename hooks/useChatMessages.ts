import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'

interface ChatMessage {
  id: string
  chat_id: string
  sender_id: string
  message: string
  created_at: string
}

export function useChatMessages(chatId: string | null) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (chatId) {
      setLoading(true)
      fetchMessages()
      
      // Set up real-time subscription for new messages
      const subscription = supabase
        .channel(`chat_messages_${chatId}`)
        .on('postgres_changes', 
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'chat_messages',
            filter: `chat_id=eq.${chatId}`
          }, 
          () => {
            fetchMessages() // Refresh messages when new ones are added
          }
        )
        .subscribe()

      return () => {
        subscription.unsubscribe()
      }
    } else {
      setMessages([])
      setLoading(false)
    }
  }, [chatId])

  const fetchMessages = async () => {
    if (!chatId) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching chat messages:', error)
        setMessages([])
      } else {
        setMessages(data || [])
      }
    } catch (error) {
      console.error('Error fetching chat messages:', error)
      setMessages([])
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async (message: string): Promise<boolean> => {
    if (!chatId || !user || !message.trim()) {
      console.error('Cannot send message: missing required data')
      return false
    }

    // Validate message length
    if (message.trim().length > 1000) {
      console.error('Message too long')
      return false
    }

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          chat_id: chatId,
          sender_id: user.id,
          message: message.trim()
        })

      if (error) {
        console.error('Error sending message:', error)
        return false
      }

      // Update chat's last_message_at
      await supabase
        .from('chats')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', chatId)

      // Immediately fetch messages to update the UI
      fetchMessages()
      return true
    } catch (error) {
      console.error('Error sending message:', error)
      return false
    }
  }

  return { messages, loading, sendMessage, refetch: fetchMessages }
}