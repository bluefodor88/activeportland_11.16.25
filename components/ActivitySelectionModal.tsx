import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useActivities } from '@/hooks/useActivities';
import { useProfile } from '@/hooks/useProfile';

const skillLevels = ['Beginner', 'Intermediate', 'Advanced'];

interface ActivitySelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  excludeActivityIds?: string[]; // Activities to exclude (already selected)
}

export function ActivitySelectionModal({
  visible,
  onClose,
  onSuccess,
  excludeActivityIds = [],
}: ActivitySelectionModalProps) {
  const { activities, loading } = useActivities();
  const { updateSkillLevel } = useProfile();
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [selectedSkillLevel, setSelectedSkillLevel] = useState<string | null>(null);
  const [readyToday, setReadyToday] = useState(false);

  const getSkillColor = (skillLevel: string) => {
    switch (skillLevel) {
      case 'Beginner':
        return '#4CAF50';
      case 'Intermediate':
        return '#FFCF56';
      case 'Advanced':
        return '#FF6B35';
      default:
        return '#999';
    }
  };

  const handleActivitySelect = (activity: any) => {
    setSelectedActivity(activity);
    setSelectedSkillLevel(null);
    setReadyToday(false);
    setShowSkillModal(true);
  };

  const handleSkillSelect = (skillLevel: string) => {
    setSelectedSkillLevel(skillLevel);
  };

  const handleSubmit = async () => {
    if (!selectedActivity) {
      Alert.alert('Error', 'No activity selected. Please try again.');
      return;
    }

    if (!selectedSkillLevel) {
      Alert.alert('Error', 'Please select a skill level');
      return;
    }

    try {
      console.log('Submitting activity:', {
        activityId: selectedActivity.id,
        activityName: selectedActivity.name,
        skillLevel: selectedSkillLevel,
        readyToday,
      });

      // Don't hide modal yet - wait for success
      const success = await updateSkillLevel(
        selectedActivity.id,
        selectedSkillLevel as 'Beginner' | 'Intermediate' | 'Advanced',
        readyToday
      );

      if (!success) {
        Alert.alert('Error', 'Failed to add activity. Please try again.');
        // Keep modal open so user can try again
        return;
      }

      // Success - reset state and close
      setShowSkillModal(false);
      setSelectedActivity(null);
      setSelectedSkillLevel(null);
      setReadyToday(false);

      // Call success callback
      if (onSuccess) {
        onSuccess();
      }

      // Close modal
      onClose();
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      Alert.alert(
        'Error', 
        `An unexpected error occurred: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`
      );
      // Keep modal open so user can try again
    }
  };

  // Filter out already selected activities
  const availableActivities = activities.filter(
    (activity) => !excludeActivityIds.includes(activity.id)
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Activity Selection View */}
          {!showSkillModal ? (
            <>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select an Activity</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.activitiesList}>
                {loading ? (
                  <Text style={styles.loadingText}>Loading activities...</Text>
                ) : availableActivities.length === 0 ? (
                  <Text style={styles.emptyText}>
                    No more activities available to add
                  </Text>
                ) : (
                  availableActivities.map((activity) => (
                    <TouchableOpacity
                      key={activity.id}
                      style={styles.activityCard}
                      onPress={() => handleActivitySelect(activity)}
                    >
                      <Text style={styles.activityEmoji}>{activity.emoji}</Text>
                      <View style={styles.activityInfo}>
                        <Text style={styles.activityName}>{activity.name}</Text>
                        {activity.description && (
                          <Text style={styles.activityDescription}>
                            {activity.description}
                          </Text>
                        )}
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#999" />
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </>
          ) : (
            /* Skill Level Selection View */
            <View style={styles.skillModalContent}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => {
                  setShowSkillModal(false);
                  setSelectedSkillLevel(null);
                  setReadyToday(false);
                }}
              >
                <Ionicons name="arrow-back" size={24} color="#333" />
              </TouchableOpacity>

              <ScrollView 
                style={styles.skillScrollView}
                contentContainerStyle={styles.centeredContent}
                showsVerticalScrollIndicator={true}
                bounces={true}
              >
                <Text style={[styles.modalTitle, styles.centeredTitle]}>
                  What's your {selectedActivity?.name || 'activity'} skill level?
                </Text>
                <Text style={styles.modalSubtitle}>
                  This helps match you with the right people
                </Text>

                <View style={styles.skillLevelsContainer}>
                  {skillLevels.map((skill) => (
                    <TouchableOpacity
                      key={skill}
                      style={styles.skillOption}
                      onPress={() => handleSkillSelect(skill)}
                    >
                      <View
                        style={[
                          styles.skillBadge,
                          { backgroundColor: getSkillColor(skill) },
                          selectedSkillLevel === skill && styles.skillBadgeSelected,
                        ]}
                      >
                        <Text style={styles.skillText}>{skill}</Text>
                        {selectedSkillLevel === skill && (
                          <Ionicons name="checkmark" size={20} color="white" style={styles.checkmarkIcon} />
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.readyTodayContainer}>
                  <TouchableOpacity
                    style={styles.readyTodayCheckbox}
                    onPress={() => setReadyToday(!readyToday)}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        readyToday && styles.checkboxChecked,
                      ]}
                    >
                      {readyToday && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <Text style={styles.readyTodayText}>
                      Are you ready to join today?
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    !selectedSkillLevel && styles.submitButtonDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={!selectedSkillLevel}
                >
                  <Text style={[
                    styles.submitButtonText,
                    !selectedSkillLevel && styles.submitButtonTextDisabled,
                  ]}>
                    Confirm
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowSkillModal(false);
                    setSelectedSkillLevel(null);
                    setReadyToday(false);
                  }}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '95%',
    minHeight: '70%',
    paddingBottom: 0,
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: '#333',
  },
  centeredTitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  closeButton: {
    padding: 4,
  },
  activitiesList: {
    padding: 20,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF8C42',
  },
  activityEmoji: {
    fontSize: 32,
    marginRight: 16,
  },
  activityInfo: {
    flex: 1,
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
  loadingText: {
    textAlign: 'center',
    padding: 20,
    color: '#666',
    fontFamily: 'Inter_400Regular',
  },
  emptyText: {
    textAlign: 'center',
    padding: 20,
    color: '#666',
    fontFamily: 'Inter_400Regular',
    fontStyle: 'italic',
  },
  skillModalContent: {
    flex: 1,
    padding: 24,
    paddingBottom: 0,
  },
  skillScrollView: {
    flex: 1,
  },
  backButton: {
    marginBottom: 16,
    padding: 4,
    alignSelf: 'flex-start',
    zIndex: 10,
  },
  centeredContent: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
    paddingTop: 20,
    paddingBottom: 100,
    flexGrow: 1,
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    marginTop: 8,
  },
  skillLevelsContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 32,
  },
  skillOption: {
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  skillBadge: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 20,
    minWidth: 200,
    width: '80%',
    maxWidth: 300,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  skillBadgeSelected: {
    borderWidth: 3,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  skillText: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: 'white',
  },
  checkmarkIcon: {
    marginLeft: 8,
  },
  readyTodayContainer: {
    marginTop: 32,
    marginBottom: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    width: '100%',
    alignItems: 'center',
  },
  readyTodayCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  checkmark: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  readyTodayText: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: '#333',
    flex: 1,
  },
  submitButton: {
    backgroundColor: '#FF8C42',
    paddingHorizontal: 48,
    paddingVertical: 18,
    borderRadius: 25,
    marginTop: 24,
    marginBottom: 16,
    minWidth: 200,
    width: '85%',
    maxWidth: 320,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF8C42',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: 'white',
    textAlign: 'center',
  },
  submitButtonTextDisabled: {
    color: '#999',
  },
  cancelButton: {
    marginTop: 8,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#666',
  },
});

