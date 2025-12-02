import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { calculateDistance, formatDistance, getCurrentLocation } from '@/lib/locationUtils'
import { useActivityStore } from '@/store/useActivityStore';

interface PersonWithSkill {
  id: string
  name: string
  email: string
  avatar_url: string | null
  skill_level: string
  distance: string
  distanceValue: number 
  ready_today: boolean
}

export function usePeople() {
  const { user } = useAuth()
  const { activityId } = useActivityStore()
  const [people, setPeople] = useState<PersonWithSkill[]>([])
  const [loading, setLoading] = useState(true)
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null)

  // Effect 1: Get User Location ONCE on mount
  useEffect(() => {
    getCurrentLocation().then((location) => {
      if (location) {
        setUserLocation(location);
      }
    });
  }, []);

  // Effect 2: Fetch People when dependencies change
  useEffect(() => {
    if (activityId && user) {
      fetchPeople();
    } else {
      setPeople([]);
      setLoading(false);
    }
  }, [activityId, user, userLocation]);

  const fetchPeople = async () => {
    if (!activityId || !user) {
      setLoading(false)
      return
    }
    
    setLoading(true)

    let currentLoc = userLocation;
    if (!currentLoc) {
      currentLoc = await getCurrentLocation();
      if (currentLoc) setUserLocation(currentLoc);
    }
    
    try {
      const { data, error } = await supabase
        .from('user_activity_skills')
        .select(`
          id,
          user_id,
          activity_id,
          skill_level,
          ready_today,
          profiles!user_activity_skills_user_id_fkey (
            id,
            name,
            email,
            avatar_url,
            created_at,
            updated_at,
            latitude,
            longitude,
            location_sharing_enabled
          )
        `)
        .eq('activity_id', activityId)
        .not('profiles', 'is', null)

      if (error) {
        console.log('Clearing people list - error:', error)
        console.error('Error fetching people:', error)
        setPeople([])
      } else if (data) {
        const filteredData = data?.filter(item => {
          const profileData = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
          return profileData && item.user_id !== user.id;
        })
        
        const peopleWithSkills = filteredData?.map(item => {
          const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
          
          return {
            id: profile.id,
            name: profile.name,
            email: profile.email,
            avatar_url: profile.avatar_url,
            skill_level: item.skill_level,
            ready_today: item.ready_today ?? false,
            distance: calculateDistanceForUser(profile, currentLoc), 
            distanceValue: calculateDistanceValueForUser(profile, currentLoc)
          };
        })
        
        // Sort by ready_today first (ready people at top), then by distance
        peopleWithSkills?.sort((a, b) => {
          // Priority 1: Ready Today (true first)
          if (a.ready_today !== b.ready_today) {
            return a.ready_today ? -1 : 1
          }
          // Priority 2: Distance (closest first)
          return a.distanceValue - b.distanceValue
        })
        
        setPeople(peopleWithSkills)
      } else {
        setPeople([])
      }
    } catch (error) {
      console.error('Unexpected error fetching people:', error)
      setPeople([])
    } finally {
      setLoading(false)
    }
  }

  // Helper to get formatted string
  const calculateDistanceForUser = (profile: any, currentLoc: any): string => {
    if (!profile.location_sharing_enabled) return 'Location private'
    if (!currentLoc || !profile.latitude || !profile.longitude) return '...'
    
    const dist = calculateDistance(currentLoc, { latitude: profile.latitude, longitude: profile.longitude })
    return formatDistance(dist)
  }

  // Helper to get number for sorting
  const calculateDistanceValueForUser = (profile: any, currentLoc: any): number => {
    // If no location, return a huge number so they go to bottom of list
    if (!profile.location_sharing_enabled) return 999999
    if (!currentLoc || !profile.latitude || !profile.longitude) return 999998
    
    return calculateDistance(currentLoc, { latitude: profile.latitude, longitude: profile.longitude })
  }

  const updateReadyToday = async (activityId: string, ready: boolean) => {
    if (!user) return false

    try {
      const { error } = await supabase
        .from('user_activity_skills')
        .upsert({
          user_id: user.id,
          activity_id: activityId,
          ready_today: ready,
        }, {
          onConflict: 'user_id,activity_id'
        })

      if (error) {
        console.error('Error updating ready_today:', error)
        return false
      } else {
        // Refresh the people list
        fetchPeople()
        return true
      }
    } catch (error) {
      console.error('Error updating ready_today:', error)
      return false
    }
  }

  return { people, loading, refetch: fetchPeople, updateReadyToday }
}