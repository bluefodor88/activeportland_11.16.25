import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  Pressable,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useActivityContext } from '@/contexts/ActivityContext';
import { useForumMessages } from '@/hooks/useForumMessages';
import { useProfile } from '@/hooks/useProfile';
import { getOrCreateChat } from '@/hooks/useChats';
import { useAuth } from '@/hooks/useAuth';
import { ActivityHeader } from '@/components/ActivityHeader';
import { LoadingSpinner } from '@/components/LoadingSpinner';


export default function ForumScreen() {
  const { activityId, activity, skillLevel, emoji } = useActivityContext();

  const { messages, loading, sendMessage } = useForumMessages(activityId);
  const { profile } = useProfile();
  const { user } = useAuth();
  const [newMessage, setNewMessage] = useState('');
  const [replyingTo, setReplyingTo] = useState<any>(null);

  const handleSendMessage = async () => {
    if (newMessage.trim()) {
      if (newMessage.trim().length > 1000) {
        Alert.alert('Message Too Long', 'Please keep messages under 1000 characters');
        return;
      }
      
      const success = await sendMessage(newMessage, replyingTo?.id);
      if (success) {
        setNewMessage('');
        setReplyingTo(null);
      } else {
        Alert.alert('Error', 'Failed to send message. Please try again.');
      }
    }
  };

  const handleLongPress = (message: any) => {
    if (message.user_id === user?.id) return; // Don't allow replying to own messages
    
    setReplyingTo(message);
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };
  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const openUserChat = async (message: any) => {
    if (!user || !message.profiles || message.user_id === user.id) return;
    
    try {
      const chatId = await getOrCreateChat(user.id, message.user_id);
      if (chatId) {
        router.push({
          pathname: '/chat/[id]',
          params: { id: message.user_id, name: message.profiles.name }
        });
      }
    } catch (error) {
      console.error('Error opening chat:', error);
    }
  };

  const getSkillColor = (skillLevel: string) => {
    switch (skillLevel) {
      case 'Beginner':
        return '#4CAF50';
      case 'Intermediate':
        return '#FFBF00';
      case 'Advanced':
        return '#FF9800';
      default:
        return '#999';
    }
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMe = item.profiles?.name === profile?.name;
    const userName = isMe ? 'You' : item.profiles?.name || 'Unknown';
    const avatarUrl = item.profiles?.avatar_url || 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2';
    
    // Get the user's skill level for this activity
    const getUserSkillLevel = () => {
      if (isMe) return skillLevel;
      // For other users, we'd need to join with user_activity_skills
      // For now, return a default
      return 'Intermediate';
    };
    
    const userSkillLevel = getUserSkillLevel();

    // Find the message this is replying to
    const replyToMessage = item.reply_to_id ? 
      messages.find(msg => msg.id === item.reply_to_id) : null;
    
    return (
    <Pressable 
      style={styles.messageContainer}
      onLongPress={() => handleLongPress(item)}
      delayLongPress={500}
    >
      {replyToMessage && (
        <View style={styles.replyContainer}>
                <Ionicons name="arrow-undo" size={14} color="#666" />
          <Text style={styles.replyText}>
            Replying to {replyToMessage.profiles?.name || 'Unknown'}: {replyToMessage.message.substring(0, 50)}...
          </Text>
        </View>
      )}
      <Image source={{ uri: avatarUrl }} style={styles.messageAvatar} />
      <View style={styles.messageContent}>
      <View style={styles.messageHeader}>
        <TouchableOpacity onPress={() => openUserChat(item)}>
          <Text style={[styles.userName, !isMe && styles.clickableUserName]}>
            {userName}
          </Text>
        </TouchableOpacity>
        <View style={[styles.skillBadge, { backgroundColor: getSkillColor(userSkillLevel) }]}>
          <Text style={styles.skillText}>{userSkillLevel}</Text>
        </View>
      </View>
      <Text style={styles.messageText}>{item.message}</Text>
      </View>
    </Pressable>
  );};

  // Only show loading if we have an activity but messages are still loading
  if (loading && activityId) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <ActivityHeader />
        <View style={styles.loadingContainer}>
          <LoadingSpinner size={32} />
          <Text style={[styles.loadingText, { marginTop: 16 }]}>Loading messages...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ActivityHeader />
      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <View style={styles.headerGradient} />
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Forum</Text>
            <Text style={styles.description}>Connect with everyone in your area to share tips and build community</Text>
          </View>
          <View style={styles.userSkillContainer}>
          </View>
        </View>

        {activityId ? (
          <FlatList
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            style={styles.messagesList}
            contentContainerStyle={styles.messagesContainer}
          />
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Select an activity to join the forum</Text>
            <Text style={styles.emptySubtitle}>
              Choose an activity from the Activities tab to start chatting with the community
            </Text>
          </View>
        )}

        {activityId && (
          <>
            {replyingTo && (
              <View style={styles.replyPreview}>
                <View style={styles.replyPreviewHeader}>
                  <Ionicons name="arrow-undo" size={16} color="#FF8C42" />
                  <Text style={styles.replyPreviewText}>
                    Replying to {replyingTo.profiles?.name || 'Unknown'}
                  </Text>
                  <TouchableOpacity onPress={cancelReply} style={styles.cancelReplyButton}>
                    <Ionicons name="close" size={16} color="#666" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.replyPreviewMessage} numberOfLines={2}>
                  {replyingTo.message}
                </Text>
              </View>
            )}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder={replyingTo ? `Reply to ${replyingTo.profiles?.name || 'Unknown'}...` : "Type your message..."}
              placeholderTextColor="#999"
              maxLength={1000}
              multiline
            />
            <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
                <Ionicons name="send" size={20} color="white" />
            </TouchableOpacity>
          </View>
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eaecee',
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    position: 'relative',
    overflow: 'hidden',
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#FF8C42',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: '#333',
    textShadowColor: 'rgba(255, 140, 66, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
   gap: 12,
  },
  description: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    fontStyle: 'italic',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    marginTop: 4,
  },
  userSkillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  userSkillLabel: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#666',
  },
  userSkillBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  userSkillText: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: 'white',
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    padding: 16,
  },
  messageContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FFCF56',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 2,
    transform: [{ scale: 1 }],
  },
  messageAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  messageContent: {
    flex: 1,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  userName: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: '#333',
    marginRight: 8,
  },
  clickableUserName: {
    color: '#1565C0',
    textDecorationLine: 'underline',
  },
  skillBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 8,
  },
  skillText: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    color: 'white',
  },
  timestamp: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#999',
    marginLeft: 'auto',
  },
  messageText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#333',
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    alignItems: 'flex-end',
  },
  textInput: {
    fontFamily: 'Inter_400Regular',
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    maxHeight: 100,
    backgroundColor: '#f9f9f9',
  },
  sendButton: {
    backgroundColor: '#FF8C42',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  replyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  replyText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    marginLeft: 4,
    flex: 1,
  },
  replyPreview: {
    backgroundColor: '#FFF3E0',
    borderLeftWidth: 3,
    borderLeftColor: '#FF8C42',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
  },
  replyPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  replyPreviewText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#FF8C42',
    flex: 1,
    marginLeft: 4,
  },
  cancelReplyButton: {
    padding: 4,
  },
  replyPreviewMessage: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    fontStyle: 'italic',
  },
});