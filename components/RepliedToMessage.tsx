import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import React from 'react';

interface RepliedToMessageProps {
  replyToId: string;
  replyToMessage: any;
  messageItem: any;
  scrollToMessage: (id: string) => void;
}

const RepliedToMessage = ({
  replyToId,
  replyToMessage,
  messageItem,
  scrollToMessage,
}: RepliedToMessageProps) => {
  return (
    <TouchableOpacity
      style={styles.replyContainer}
      onPress={() => scrollToMessage(replyToId)}
    >
      <Text style={styles.replyToName}>
        {replyToMessage.profiles?.name || 'Unknown'}
      </Text>
      <Text style={styles.replyText} numberOfLines={4} ellipsizeMode={'tail'}>
        {replyToMessage.message}
      </Text>
    </TouchableOpacity>
  );
};

export default RepliedToMessage;

const styles = StyleSheet.create({
  replyContainer: {
    borderLeftWidth: 2,
    borderLeftColor: '#FFCF5650',
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  replyToName: {
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
    color: '#101010',
    flex: 1,
    marginBottom: 4
  },
  replyText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    flex: 1,
  },
});
