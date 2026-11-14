import { useAuthStore } from '@/stores/auth.store';
import { useChatStore } from '@/stores/chat.store';
import { ChatMessage } from '@/types/chat';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

const PRIMARY = '#00615F';
const TEXT_DARK = '#0F172A';
const TEXT_MUTED = '#64748B';
const BG_CHAT = '#F8F9FA';
const INCOMING_BUBBLE = '#E2E8F0';
const OUTGOING_BUBBLE = '#00615F';

export default function MitraChatScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    conversation,
    messages,
    isLoadingConversation,
    isLoadingMessages,
    isUploadingAttachment,
    error,
    loadConversationByOrderId,
    sendTextMessage,
    sendImageMessage,
    setupSocketListeners,
    cleanup,
  } = useChatStore();

  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList<ChatMessage>>(null);

  useEffect(() => {
    if (orderId) {
      loadConversationByOrderId(orderId);
    }
    const unsubscribe = setupSocketListeners();
    return () => {
      unsubscribe();
      cleanup();
    };
  }, [orderId]);

  const handleSendText = async () => {
    if (!inputText.trim() || !user) return;
    const textToSend = inputText;
    setInputText('');
    await sendTextMessage(textToSend, user.id, 'mitra');
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handlePickImage = async () => {
    if (!user || conversation?.status !== 'active') return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Izin akses galeri foto diperlukan untuk mengirim gambar');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      await sendImageMessage(
        asset.uri,
        user.id,
        'mitra',
        asset.fileName || 'chat_image.jpg',
        asset.mimeType || 'image/jpeg',
      );
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const isConversationActive = conversation?.status === 'active';
  const customerName = conversation?.customer?.name || 'Pelanggan';
  const customerPhoto = conversation?.customer?.photoUrl;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path
              d="M15 19l-7-7 7-7"
              stroke={PRIMARY}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </TouchableOpacity>

        <View style={styles.avatarContainer}>
          {customerPhoto ? (
            <Image source={{ uri: customerPhoto }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarInitial}>
                {customerName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.headerInfo}>
          <Text style={styles.partnerName} numberOfLines={1}>
            {customerName}
          </Text>
          <Text style={styles.orderSubtitle}>
            {conversation?.order?.id
              ? `Pesanan #${conversation.order.id.slice(0, 8)}`
              : 'Chat Pelanggan'}
          </Text>
        </View>
      </View>

      {/* Main Chat Body */}
      <KeyboardAvoidingView
        style={styles.flexOne}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Status Banner when inactive */}
        {conversation?.status === 'waiting' && (
          <View style={styles.waitingBanner}>
            <Text style={styles.waitingBannerText}>
              ⏳ Pesanan belum diproses. Terima pesanan terlebih dahulu untuk membuka obrolan.
            </Text>
          </View>
        )}

        {conversation?.status === 'closed' && (
          <View style={styles.closedBanner}>
            <Text style={styles.closedBannerText}>
              🔒 Percakapan telah berakhir karena pesanan telah selesai/dibatalkan.
            </Text>
          </View>
        )}

        {isLoadingConversation || (isLoadingMessages && messages.length === 0) ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={PRIMARY} />
            <Text style={styles.loadingText}>Memuat percakapan...</Text>
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.clientMessageId || item.id}
            contentContainerStyle={styles.messagesList}
            onEndReachedThreshold={0.2}
            onContentSizeChange={() => {
              flatListRef.current?.scrollToEnd({ animated: false });
            }}
            renderItem={({ item }) => {
              const isMe = item.senderRole === 'mitra';
              const timeString = new Date(item.createdAt).toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <View
                  style={[
                    styles.messageRow,
                    isMe ? styles.messageRowOutgoing : styles.messageRowIncoming,
                  ]}
                >
                  <View
                    style={[
                      styles.messageBubble,
                      isMe ? styles.bubbleOutgoing : styles.bubbleIncoming,
                    ]}
                  >
                    {item.type === 'image' ? (
                      <View style={styles.imageContainer}>
                        {item.attachment?.signedUrl ? (
                          <Image
                            source={{ uri: item.attachment.signedUrl }}
                            style={styles.attachmentImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.imagePlaceholder}>
                            <ActivityIndicator size="small" color={PRIMARY} />
                          </View>
                        )}
                      </View>
                    ) : (
                      <Text
                        style={[
                          styles.messageText,
                          isMe ? styles.textOutgoing : styles.textIncoming,
                        ]}
                      >
                        {item.content}
                      </Text>
                    )}

                    <View style={styles.metaRow}>
                      <Text
                        style={[
                          styles.metaTime,
                          isMe ? styles.metaTimeOutgoing : styles.metaTimeIncoming,
                        ]}
                      >
                        {timeString}
                      </Text>
                      {isMe && (
                        <Text style={styles.metaCheck}>
                          {item.isSending ? '🕒' : item.isFailed ? '⚠️' : '✓'}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              );
            }}
          />
        )}

        {/* Input Bar */}
        {isConversationActive ? (
          <View style={styles.inputContainer}>
            <TouchableOpacity
              style={styles.attachButton}
              onPress={handlePickImage}
              disabled={isUploadingAttachment}
            >
              {isUploadingAttachment ? (
                <ActivityIndicator size="small" color={PRIMARY} />
              ) : (
                <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M12 5v14M5 12h14"
                    stroke={PRIMARY}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              )}
            </TouchableOpacity>

            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Tulis pesan..."
              placeholderTextColor="#94A3B8"
              multiline
              maxLength={1000}
            />

            <TouchableOpacity
              style={[
                styles.sendButton,
                !inputText.trim() && styles.sendButtonDisabled,
              ]}
              onPress={handleSendText}
              disabled={!inputText.trim()}
            >
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
                  stroke="#FFFFFF"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </TouchableOpacity>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  flexOne: {
    flex: 1,
    backgroundColor: BG_CHAT,
  },
  header: {
    height: 60,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
  },
  backButton: {
    padding: 6,
    marginRight: 6,
  },
  avatarContainer: {
    marginRight: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    backgroundColor: '#CEE7E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: 'bold',
    color: PRIMARY,
  },
  headerInfo: {
    flex: 1,
  },
  partnerName: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_DARK,
  },
  orderSubtitle: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  waitingBanner: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  waitingBannerText: {
    fontSize: 13,
    color: '#92400E',
    textAlign: 'center',
  },
  closedBanner: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  closedBannerText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: TEXT_MUTED,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  messageRow: {
    marginVertical: 4,
    flexDirection: 'row',
  },
  messageRowOutgoing: {
    justifyContent: 'flex-end',
  },
  messageRowIncoming: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  bubbleOutgoing: {
    backgroundColor: OUTGOING_BUBBLE,
    borderBottomRightRadius: 4,
  },
  bubbleIncoming: {
    backgroundColor: INCOMING_BUBBLE,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  textOutgoing: {
    color: '#FFFFFF',
  },
  textIncoming: {
    color: '#1E293B',
  },
  imageContainer: {
    width: 220,
    height: 180,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#CBD5E1',
    marginBottom: 4,
  },
  attachmentImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  metaTime: {
    fontSize: 10,
  },
  metaTimeOutgoing: {
    color: 'rgba(255, 255, 255, 0.75)',
  },
  metaTimeIncoming: {
    color: '#64748B',
  },
  metaCheck: {
    fontSize: 10,
    marginLeft: 4,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  inputContainer: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#EAEAEA',
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#CEE7E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    color: TEXT_DARK,
    marginHorizontal: 8,
    maxHeight: 90,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});
