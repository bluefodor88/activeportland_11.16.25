import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Modal,
  Dimensions,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useActivities } from '@/hooks/useActivities';
import { useProfile } from '@/hooks/useProfile';
import { useActivityContext } from '@/contexts/ActivityContext';


const skillLevels = ['Beginner', 'Intermediate', 'Advanced'];

const { width } = Dimensions.get('window');
const isSmallDevice = width < 375; // iPhone SE and smaller
const isMediumDevice = width < 414; // iPhone 8 Plus and smaller

export default function ActivitiesScreen() {
  const { activities, loading: activitiesLoading } = useActivities();
  const { updateSkillLevel, refetch: refetchProfile } = useProfile();
  const { setActivityContext } = useActivityContext();
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [showSkillModal, setShowSkillModal] = useState(false);

  const handleActivitySelect = (activity: any) => {
    setSelectedActivity(activity);
    setShowSkillModal(true);
  };

  const handleSkillSelect = async (skillLevel: string) => {
    setShowSkillModal(false);
    
    console.log('Updating skill level for activity:', selectedActivity.id, 'skill:', skillLevel);
    
    // Update user's skill level for this activity
    const success = await updateSkillLevel(selectedActivity.id, skillLevel as 'Beginner' | 'Intermediate' | 'Advanced');
    
    console.log('Skill level update success:', success);
    
    if (!success) {
      Alert.alert('Error', 'Failed to update skill level. Please try again.');
      return;
    }
    
    // Force refresh the profile data to ensure it shows the new skill level
    console.log('Forcing profile refresh after skill update...');
    refetchProfile();
    
    console.log('Skill level updated successfully, navigating to forum...');
    
    // Set the activity context for all tabs
    setActivityContext({
      activityId: selectedActivity.id,
      activity: selectedActivity.name,
      skillLevel: skillLevel,
      emoji: selectedActivity.emoji
    });
    
    // Navigate to people tab with activity and skill level
    router.push({
      pathname: '/(tabs)/forum', 
      params: { 
        activityId: selectedActivity.id,
        activity: selectedActivity.name,
        skillLevel: skillLevel,
        emoji: selectedActivity.emoji
      }
    });
    
    // Set global params for all tabs
    setTimeout(() => {
      router.setParams({
        activityId: selectedActivity.id,
        activity: selectedActivity.name,
        skillLevel: skillLevel,
        emoji: selectedActivity.emoji
      });
    }, 50);
  };

  const getSkillColor = (skillLevel: string) => {
    switch (skillLevel) {
      case 'Beginner':
        return '#4CAF50';
      case 'Intermediate':
        return '#FFCF56';
      case 'Advanced':
        return '#FF6B35';
      case 'Expert':
        return '#F44336';
      default:
        return '#999';
    }
  };

  if (activitiesLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading activities...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.logo}>
            <Text style={{ color: '#FFCF56' }}>The</Text>
            <Text style={{ color: '#FF8C42' }}>Activity</Text>
            <Text style={{ color: '#FFCF56' }}>Hub</Text>
          </Text>
          <View style={styles.logoUnderline} />
          <Text style={styles.location}>Portland, ME</Text>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>How it works</Text>
          <Text style={styles.infoText}>
            1. Select an activity{'\n'}
            2. Choose your skill level{'\n'}
            3. Chat with the community or message individuals{'\n'}
            4. Meet up and enjoy the activity!
          </Text>
        </View>

        <View style={styles.activitiesContainer}>
          {activities.map((activity) => (
            <TouchableOpacity
              key={activity.id}
              style={styles.activityCard}
              onPress={() => handleActivitySelect(activity)}
            >
              <View style={styles.activityEmoji}>
                <Text style={styles.emoji}>{activity.emoji}</Text>
              </View>
              <View style={styles.activityInfo}>
                <Text style={styles.activityName}>{activity.name}</Text>
                <Text style={styles.activityDescription}>
                  {activity.description}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <Modal
        visible={showSkillModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSkillModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              What's your {selectedActivity?.name} skill level?
            </Text>
            <Text style={styles.modalSubtitle}>
              This helps match you with the right people
            </Text>
            
            {skillLevels.map((skill) => (
              <TouchableOpacity
                key={skill}
                style={styles.skillOption}
                onPress={() => handleSkillSelect(skill)}
              >
                <View style={[styles.skillBadge, { backgroundColor: getSkillColor(skill) }]}>
                  <Text style={styles.skillText}>{skill}</Text>
                </View>
              </TouchableOpacity>
            ))}
            
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowSkillModal(false)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F6',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    fontSize: isSmallDevice ? 24 : isMediumDevice ? 30 : 36,
    fontFamily: 'Inter_800ExtraBold',
    fontStyle: 'italic',
    textShadowColor: 'rgba(255, 140, 66, 0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  logoUnderline: {
    width: 50,
    height: 3,
    backgroundColor: '#FF8C42',
    borderRadius: 2,
    marginTop: 6,
    marginBottom: 4,
  },
  location: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#666',
    marginTop: 2,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    textAlign: 'center',
  },
  tagline: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  activitiesContainer: {
    marginBottom: 32,
  },
  activityCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF8C42',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    transform: [{ scale: 1 }],
  },
  activityEmoji: {
    marginRight: 16,
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 32,
  },
  activityInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  activityName: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: '#333',
    marginBottom: 4,
  },
  activityDescription: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#666',
  },
  infoContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#FFCF56',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  infoTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    lineHeight: 20,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    margin: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  skillOption: {
    alignItems: 'center',
    marginBottom: 12,
  },
  skillBadge: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    minWidth: 120,
    alignItems: 'center',
  },
  skillText: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: 'white',
  },
  cancelButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#666',
  },
});