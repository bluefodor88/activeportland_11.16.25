import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import type { ForumMessage } from '@/types/database'

export function useForumMessages(activityId?: string) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<ForumMessage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (activityId) {
      fetchMessages()
      
      // Set up real-time subscription for new messages
      const subscription = supabase
        .channel(`forum_messages_${activityId}`)
        .on('postgres_changes', 
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'forum_messages',
            filter: `activity_id=eq.${activityId}`
          }, 
          () => {
            fetchMessages() // Refresh messages when new ones are added
          }
        )
        .subscribe()

      return () => {
        subscription.unsubscribe()
      }
    }
  }, [activityId])

  const fetchMessages = async () => {
    if (!activityId) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('forum_messages')
        .select(`
          *,
          reply_to:forum_messages!reply_to_id (
            id,
            message,
            profiles!user_id (
              name
            )
          ),
          profiles (
            name,
            avatar_url
          ),
          activities (
            name,
            emoji
          )
        `)
        .eq('activity_id', activityId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching forum messages:', error)
        setMessages([])
      } else {
        setMessages(data || [])
      }
    } catch (error) {
      console.error('Error fetching forum messages:', error)
      setMessages([])
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async (message: string, replyToId?: string) => {
    if (!activityId || !message.trim()) {
      console.error('Cannot send message: missing activity ID or empty message')
      return false
    }

    // Validate message length
    if (message.trim().length > 1000) {
      console.error('Message too long')
      return false
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.error('User not authenticated')
        return false
      }

      const { error } = await supabase
        .from('forum_messages')
        .insert({
          activity_id: activityId,
          user_id: user.id,
          message: message.trim(),
          reply_to_id: replyToId || null
        })

      if (error) {
        console.error('Error sending message:', error)
        return false
      } else {
        fetchMessages() // Refresh messages
        return true
      }
    } catch (error) {
      console.error('Error sending message:', error)
      return false
    }
  }

  return { messages, loading, sendMessage, refetch: fetchMessages }
}