import { useState, useEffect } from 'react'
import { Platform } from 'react-native'
import * as Location from 'expo-location'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { updateUserLocation } from '@/lib/locationUtils'

export function useLocationTracking() {
  const { user } = useAuth()
  const [location, setLocation] = useState<{latitude: number, longitude: number} | null>(null)
  const [locationPermission, setLocationPermission] = useState<boolean>(false)
  const [loading, setLoading] = useState(true)
  const [hasRequestedPermission, setHasRequestedPermission] = useState(false)

  // Only set up mock location for web, don't auto-request permissions
  useEffect(() => {
    if (user && Platform.OS === 'web') {
      setupMockLocation()
    }
  }, [user])

  const setupMockLocation = () => {
    const mockLocation = {
      latitude: 43.6591 + (Math.random() - 0.5) * 0.01,
      longitude: -70.2568 + (Math.random() - 0.5) * 0.01,
    }
    setLocation(mockLocation)
    setLocationPermission(true)
    
    // Update user's location in database
    if (user) {
      updateUserLocation(supabase, user.id, mockLocation)
    }
    
    setLoading(false)
  }

  const requestLocationPermission = async () => {
    if (hasRequestedPermission) return locationPermission
    
    setLoading(true)
    
    try {
      if (Platform.OS === 'web') {
        setupMockLocation()
        return true
      }

      // Check current permission status first
      const { status: currentStatus } = await Location.getForegroundPermissionsAsync()
      
      if (currentStatus === 'granted') {
        setLocationPermission(true)
        setHasRequestedPermission(true)
        await updateLocation()
        return true
      }

      // Request permission if not already granted
      const { status } = await Location.requestForegroundPermissionsAsync()
      setHasRequestedPermission(true)
      
      if (status !== 'granted') {
        console.log('Location permission denied')
        setLocationPermission(false)
        return false
      }

      setLocationPermission(true)
      await updateLocation()
      return true

    } catch (error) {
      console.error('Error getting location:', error)
      setLocationPermission(false)
      return false
    } finally {
      setLoading(false)
    }
  }

  const updateLocation = async () => {
    if (!locationPermission || !user) return

    try {
      if (Platform.OS === 'web') {
        // Use mock data for web
        const mockLocation = {
          latitude: 43.6591 + (Math.random() - 0.5) * 0.01,
          longitude: -70.2568 + (Math.random() - 0.5) * 0.01,
        }
        setLocation(mockLocation)
        await updateUserLocation(supabase, user.id, mockLocation)
        return
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })

      const coordinates = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      }

      setLocation(coordinates)
      await updateUserLocation(supabase, user.id, coordinates)
    } catch (error) {
      console.error('Error updating location:', error)
    }
  }

  return {
    location,
    locationPermission,
    loading,
    updateLocation,
    requestLocationPermission
  }
}