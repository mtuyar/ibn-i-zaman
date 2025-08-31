import { StyleSheet, Platform, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
const STATUSBAR_HEIGHT = Platform.OS === 'ios' ? 47 : 24;
const HEADER_HEIGHT = STATUSBAR_HEIGHT + 80; // status bar + padding + search bar height + extra space

export const chatStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: STATUSBAR_HEIGHT + 16,
    backgroundColor: '#2F80ED',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    height: HEADER_HEIGHT,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 16,
    color: '#fff',
  },
  searchPlaceholder: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  newMessageButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  chatList: {
    flex: 1,
    marginTop: HEADER_HEIGHT + 8, // header height + extra padding
    paddingHorizontal: 16,
  },
  chatItem: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5E5',
  },
  chatItemContent: {
    flex: 1,
    flexDirection: 'row',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
    backgroundColor: '#E5E5E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
  },
  chatContent: {
    flex: 1,
    justifyContent: 'center',
  },
  chatName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 2,
  },
  lastMessage: {
    fontSize: 14,
    color: '#8E8E93',
    marginRight: 40,
  },
  unreadBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#FF9500',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadCount: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  timeText: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF3B30',
    height: '100%',
    paddingHorizontal: 20,
  },
  actionButton: {
    padding: 10,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  swipeableContent: {
    flex: 1,
  },
}); 