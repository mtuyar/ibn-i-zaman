import { StyleSheet, Platform, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
const STATUSBAR_HEIGHT = Platform.OS === 'ios' ? 47 : 24;

export const chatDetailStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 15,
    backgroundColor: '#2E7DFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    zIndex: 1,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7DFF',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  userStatus: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  onlineStatus: {
    color: '#FFFFFF',
  },
  offlineStatus: {
    color: '#FFFFFF',
    opacity: 0.7,
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    flexGrow: 1,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    maxWidth: width * 0.75,
  },
  sentMessageContainer: {
    alignSelf: 'flex-end',
    marginLeft: 'auto',
  },
  receivedMessageContainer: {
    alignSelf: 'flex-start',
    marginRight: 'auto',
  },
  messageContent: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  sentMessage: {
    backgroundColor: '#2E7DFF',
    borderTopRightRadius: 4,
  },
  receivedMessage: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  sentMessageText: {
    color: '#FFFFFF',
  },
  receivedMessageText: {
    color: '#1A1A1A',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
    opacity: 0.7,
  },
  sentMessageTime: {
    color: '#FFFFFF',
    textAlign: 'right',
  },
  receivedMessageTime: {
    color: '#8E8E93',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2E7DFF',
    marginRight: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  input: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingTop: 8,
    maxHeight: 100,
    fontSize: 16,
    color: '#1A1A1A',
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  statusBar: {
    backgroundColor: '#2E7DFF',
  },
  linearGradient: {
    flex: 1,
  },
  backButtonIcon: {
    color: '#FFFFFF',
    fontSize: 24,
  },
  messageListContainer: {
    flex: 1,
    paddingBottom: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  inputField: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    fontSize: 14,
    maxHeight: 100,
  },
  sendButtonContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2E7DFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonIcon: {
    color: '#FFFFFF',
    fontSize: 20,
  },
  typingIndicatorContainer: {
    padding: 10,
    backgroundColor: '#F5F5F5',
  },
  typingText: {
    fontSize: 12,
    color: '#666666',
    fontStyle: 'italic',
  },
  onlineStatusContainer: {
    opacity: 1,
  },
  offlineStatusContainer: {
    opacity: 0.8,
  },
}); 