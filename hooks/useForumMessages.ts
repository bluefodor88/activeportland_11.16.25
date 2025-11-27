import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import type { ForumMessage } from '@/types/database'
import { Alert } from 'react-native';

export function useForumMessages(activityId?: string) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<ForumMessage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (activityId) {
      // 1. Load initial messages
      fetchMessages(true) 
      
      // 2. Set up real-time listener
      const subscription = supabase
        .channel(`forum_messages_${activityId}`)
        .on('postgres_changes', 
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'forum_messages',
            filter: `activity_id=eq.${activityId}`
          }, 
          (payload) => {
            // When a new message arrives, fetch silently (no spinner)
            fetchMessages(false)
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(subscription)
      }
    }
  }, [activityId])

  const fetchMessages = async (showLoading = false) => {
    if (!activityId) return

    if (showLoading) setLoading(true)
      
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
            avatar_url,
            user_activity_skills (
              skill_level,
              ready_today,
              activity_id
            )
          ),
          activities (
            name,
            emoji
          )
        `)
        .eq('activity_id', activityId)
        .eq('profiles.user_activity_skills.activity_id', activityId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching forum messages:', error)
      } else {
        setMessages(data || [])
      }
    } catch (error) {
      console.error('Error fetching forum messages:', error)
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  const sendMessage = async (message: string, replyToId?: string) => {
    if (!activityId || !message.trim()) return false
    // Validate message length
    if (message.trim().length > 1000) {
      Alert.alert('Message too long')
      return false
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return false

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
        // Refresh immediately without spinner
        fetchMessages(false) 
        return true
      }
    } catch (error) {
      console.error('Error sending message:', error)
      return false
    }
  }

  return { messages, loading, sendMessage, refetch: () => fetchMessages(false) }
}