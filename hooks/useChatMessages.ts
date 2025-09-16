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
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (chatId) {
      setLoading(true)
      setError(null)
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
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('Successfully subscribed to chat messages')
          } else if (status === 'CHANNEL_ERROR') {
            console.error('Error subscribing to chat messages')
            setError('Failed to connect to real-time updates')
          }
        })

      return () => {
        try {
          subscription.unsubscribe()
        } catch (error) {
          console.error('Error unsubscribing from chat messages:', error)
        }
      }
    } else {
      setMessages([])
      setLoading(false)
      setError(null)
    }
  }, [chatId])

  const fetchMessages = async () => {
    if (!chatId) return

    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching chat messages:', error)
        setError('Failed to load messages')
        setMessages([])
      } else {
        setMessages(data || [])
        setError(null)
      }
    } catch (error) {
      console.error('Error fetching chat messages:', error)
      setError('Network error - please check your connection')
      setMessages([])
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async (message: string): Promise<boolean> => {
    if (!chatId || !user || !message.trim()) {
      console.error('Cannot send message: missing required data')
      setError('Cannot send message - missing required data')
      return false
    }

    // Validate message length
    if (message.trim().length > 1000) {
      console.error('Message too long')
      setError('Message too long - please keep under 1000 characters')
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
        setError('Failed to send message')
        return false
      }

      // Update chat's last_message_at
      try {
        await supabase
          .from('chats')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', chatId)
      } catch (updateError) {
        console.warn('Failed to update chat timestamp:', updateError)
        // Don't fail the entire operation for this
      }

      // Immediately fetch messages to update the UI
      fetchMessages()
      setError(null)
      return true
    } catch (error) {
      console.error('Error sending message:', error)
      setError('Network error - please check your connection')
      return false
    }
  }

  return { messages, loading, error, sendMessage, refetch: fetchMessages }
}