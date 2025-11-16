import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useActivityContext } from '@/contexts/ActivityContext';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_WIDTH = 70;
const ITEM_SPACING = 10;
const CENTER_OFFSET = (SCREEN_WIDTH - ITEM_WIDTH) / 2;

interface UserActivity {
  id: string;
  activity_id: string;
  skill_level: string;
  ready_today: boolean;
  activities: {
    name: string;
    emoji: string;
  };
}

export function ActivityCarousel() {
  const { activityId, setActivityContext } = useActivityContext();
  const { user } = useAuth();
  const { userSkills, loading: profileLoading, refetch } = useProfile();
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const hasInitializedRef = useRef(false);
  const isScrollingRef = useRef(false);
  const lastSyncedActivityIdRef = useRef<string | undefined>(activityId);

  // Filter to only user's selected activities and sort alphabetically
  // Use a stable reference to prevent unnecessary re-renders
  const userActivities: UserActivity[] = useMemo(() => {
    if (!userSkills || userSkills.length === 0) return [];
    const filtered = userSkills.filter((skill) => skill.activities) as UserActivity[];
    const sorted = filtered.sort((a, b) => {
      const nameA = a.activities?.name || '';
      const nameB = b.activities?.name || '';
      return nameA.localeCompare(nameB);
    });
    return sorted;
  }, [userSkills]);

  // Set up real-time subscription to listen for changes to user_activity_skills
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`user_activity_skills_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_activity_skills',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          console.log('Activity skills changed, refetching...');
          refetch();
        }
      )
      .subscribe();

    return () => {
      try {
        channel.unsubscribe();
      } catch (error) {
        console.error('Error unsubscribing from activity skills changes:', error);
      }
    };
  }, [user, refetch]);

  // Initialize: select first activity if none selected (only once)
  useEffect(() => {
    if (hasInitializedRef.current) return;
    if (profileLoading || userActivities.length === 0) return;

    hasInitializedRef.current = true;

    // If we already have an activityId, find its index
    if (activityId) {
      const index = userActivities.findIndex(ua => ua.activity_id === activityId);
      if (index >= 0) {
        setCurrentIndex(index);
        lastSyncedActivityIdRef.current = activityId;
        // Scroll to the correct position
        setTimeout(() => {
          if (scrollViewRef.current) {
            const offset = index * (ITEM_WIDTH + ITEM_SPACING) - CENTER_OFFSET;
            scrollViewRef.current.scrollTo({
              x: Math.max(0, offset),
              animated: false,
            });
          }
        }, 100);
        return;
      }
    }

    // Otherwise, select first activity
    if (userActivities.length > 0) {
      const firstActivity = userActivities[0];
      // Only set if different from current
      if (firstActivity.activity_id !== activityId) {
        setCurrentIndex(0);
        lastSyncedActivityIdRef.current = firstActivity.activity_id;
        setActivityContext({
          activityId: firstActivity.activity_id,
          activity: firstActivity.activities.name,
          skillLevel: firstActivity.skill_level,
          emoji: firstActivity.activities.emoji,
        });
      }
    }
  }, [profileLoading, userActivities.length, activityId]);

  // Handle activity changes: preserve current selection if it still exists, otherwise select first
  useEffect(() => {
    if (userActivities.length === 0) {
      // No activities, clear selection only if we have one
      if (activityId) {
        setActivityContext({
          activityId: '',
          activity: '',
          skillLevel: '',
          emoji: '',
        });
      }
      return;
    }
    
    if (isScrollingRef.current) return; // Don't interfere during scroll
    if (!hasInitializedRef.current) return; // Wait for initialization

    // Check if current activity still exists
    const foundIndex = userActivities.findIndex(ua => ua.activity_id === activityId);
    
    if (foundIndex >= 0) {
      // Current activity still exists - update index and scroll position if needed
      // Only update if the index actually changed to prevent infinite loops
      setCurrentIndex(prevIndex => {
        if (prevIndex !== foundIndex) {
          lastSyncedActivityIdRef.current = activityId;
          setTimeout(() => {
            if (scrollViewRef.current && !isScrollingRef.current) {
              const offset = foundIndex * (ITEM_WIDTH + ITEM_SPACING) - CENTER_OFFSET;
              scrollViewRef.current.scrollTo({
                x: Math.max(0, offset),
                animated: false,
              });
            }
          }, 50);
          return foundIndex;
        }
        return prevIndex;
      });
    } else {
      // Current activity was removed - select first available
      const firstActivity = userActivities[0];
      if (firstActivity && firstActivity.activity_id !== activityId) {
        setCurrentIndex(0);
        lastSyncedActivityIdRef.current = firstActivity.activity_id;
        setActivityContext({
          activityId: firstActivity.activity_id,
          activity: firstActivity.activities.name,
          skillLevel: firstActivity.skill_level,
          emoji: firstActivity.activities.emoji,
        });
        setTimeout(() => {
          if (scrollViewRef.current && !isScrollingRef.current) {
            scrollViewRef.current.scrollTo({ x: 0, animated: false });
          }
        }, 50);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userActivities.length, activityId]);

  // Sync carousel position when activityId changes externally (tab switch or external change)
  useEffect(() => {
    if (isScrollingRef.current) return; // Don't interfere during scroll
    if (!activityId || activityId === lastSyncedActivityIdRef.current) return;
    if (userActivities.length === 0) return;
    if (!hasInitializedRef.current) return; // Wait for initialization

    const index = userActivities.findIndex(ua => ua.activity_id === activityId);
    if (index >= 0) {
      // Use functional update to prevent infinite loops
      setCurrentIndex(prevIndex => {
        if (prevIndex !== index) {
          lastSyncedActivityIdRef.current = activityId;
          setTimeout(() => {
            if (scrollViewRef.current && !isScrollingRef.current) {
              const offset = index * (ITEM_WIDTH + ITEM_SPACING) - CENTER_OFFSET;
              scrollViewRef.current.scrollTo({
                x: Math.max(0, offset),
                animated: false,
              });
            }
          }, 50);
          return index;
        }
        return prevIndex;
      });
    }
  }, [activityId, userActivities.length]);

  // Handle scroll - find center item and select it
  const handleScrollEnd = (event: any) => {
    if (userActivities.length === 0) return;
    if (isScrollingRef.current) return; // Prevent multiple calls

    isScrollingRef.current = true;
    const offsetX = event.nativeEvent.contentOffset.x;
    const screenCenter = SCREEN_WIDTH / 2;
    
    // Find which item's center is closest to screen center
    let closestIndex = 0;
    let minDistance = Infinity;
    
    userActivities.forEach((_, index) => {
      const itemStart = CENTER_OFFSET + index * (ITEM_WIDTH + ITEM_SPACING) - offsetX;
      const itemCenter = itemStart + ITEM_WIDTH / 2;
      const distance = Math.abs(itemCenter - screenCenter);
      
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });

    const clampedIndex = Math.max(0, Math.min(closestIndex, userActivities.length - 1));
    
    // Update if different
    if (clampedIndex !== currentIndex && userActivities[clampedIndex]) {
      const selectedActivity = userActivities[clampedIndex];
      setCurrentIndex(clampedIndex);
      lastSyncedActivityIdRef.current = selectedActivity.activity_id;
      
      // Update ActivityContext - this will trigger forum and people tabs to update
      setActivityContext({
        activityId: selectedActivity.activity_id,
        activity: selectedActivity.activities.name,
        skillLevel: selectedActivity.skill_level,
        emoji: selectedActivity.activities.emoji,
      });
    }
    
    // Reset scrolling flag after a delay
    setTimeout(() => {
      isScrollingRef.current = false;
    }, 500);
  };

  // Show loading state
  if (profileLoading && userActivities.length === 0 && !hasInitializedRef.current) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Loading activities...</Text>
        </View>
      </View>
    );
  }

  if (userActivities.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No activities selected</Text>
          <Text style={styles.emptySubtext}>
            Add activities from your Profile tab
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        snapToInterval={ITEM_WIDTH + ITEM_SPACING}
        decelerationRate="fast"
        onScrollEndDrag={handleScrollEnd}
        onMomentumScrollEnd={handleScrollEnd}
        scrollEventThrottle={16}
        scrollEnabled={true}
        bounces={true}
      >
        <View style={{ width: CENTER_OFFSET }} />

        {userActivities.map((userActivity, index) => {
          const isSelected = index === currentIndex;

          return (
            <View
              key={`${userActivity.id}-${userActivity.activity_id}`}
              style={styles.itemContainer}
            >
              <View
                style={[
                  styles.activityItem,
                  isSelected && styles.activityItemSelected,
                  { opacity: isSelected ? 1 : 0.35 },
                ]}
              >
                <Text style={styles.emoji}>
                  {userActivity.activities.emoji}
                </Text>
                {userActivity.ready_today && (
                  <View style={styles.readyBadge}>
                    <Ionicons
                      name="checkmark-circle"
                      size={12}
                      color="#4CAF50"
                    />
                  </View>
                )}
              </View>
              <Text
                style={[
                  styles.activityName,
                  isSelected && styles.activityNameSelected,
                ]}
                numberOfLines={1}
              >
                {userActivity.activities.name}
              </Text>
            </View>
          );
        })}

        <View style={{ width: CENTER_OFFSET }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    paddingVertical: 16,
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  scrollContent: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  itemContainer: {
    width: ITEM_WIDTH,
    marginHorizontal: ITEM_SPACING / 2,
    alignItems: 'center',
  },
  activityItem: {
    width: ITEM_WIDTH,
    height: ITEM_WIDTH,
    borderRadius: 18,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  activityItemSelected: {
    backgroundColor: '#fff5e6',
  },
  emoji: {
    fontSize: 36,
  },
  readyBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  activityName: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: '#999',
    textAlign: 'center',
  },
  activityNameSelected: {
    fontFamily: 'Inter_700Bold',
    color: '#333',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#666',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#999',
  },
});
