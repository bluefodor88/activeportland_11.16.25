import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import type { Profile, UserActivitySkill } from '@/types/database'

export function useProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [userSkills, setUserSkills] = useState<UserActivitySkill[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchProfile()
      fetchUserSkills()
    }
  }, [user])

  const fetchProfile = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
      } else {
        setProfile(data)
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUserSkills = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('user_activity_skills')
        .select(`
          *,
          activities (
            name,
            emoji
          )
        `)
        .eq('user_id', user.id)

      if (error) {
        console.error('Error fetching user skills:', error)
      } else {
        setUserSkills(data || [])
      }
    } catch (error) {
      console.error('Error fetching user skills:', error)
    }
  }

  const updateSkillLevel = async (activityId: string, skillLevel: 'Beginner' | 'Intermediate' | 'Advanced') => {
    if (!user) return

    console.log('updateSkillLevel called with:', { userId: user.id, activityId, skillLevel });

    try {
      const { error } = await supabase
        .from('user_activity_skills')
        .upsert({
          user_id: user.id,
          activity_id: activityId,
          skill_level: skillLevel,
        }, {
          onConflict: 'user_id,activity_id'
        })

      if (error) {
        console.error('Error updating skill level:', error)
        return false
      } else {
        // Force refresh both profile and skills data
        await Promise.all([fetchProfile(), fetchUserSkills()])
        console.log('Profile and skills refreshed after update');
        return true
      }
    } catch (error) {
      console.error('Error updating skill level:', error)
      return false
    }
  }

  const removeActivity = async (activityId: string) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('user_activity_skills')
        .delete()
        .eq('user_id', user.id)
        .eq('activity_id', activityId)

      if (error) {
        console.error('Error removing activity:', error)
      } else {
        fetchUserSkills() // Refresh skills
      }
    } catch (error) {
      console.error('Error removing activity:', error)
    }
  }

  return {
    profile,
    userSkills,
    loading,
    updateSkillLevel,
    removeActivity,
    refetch: () => {
      fetchProfile()
      fetchUserSkills()
    }
  }
}