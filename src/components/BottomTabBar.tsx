import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export type BottomTabType = 'home' | 'library' | 'search' | 'settings';

interface BottomTabBarProps {
  currentTab: BottomTabType;
  onSelectTab: (tab: BottomTabType) => void;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  currentTab,
  onSelectTab,
}) => {
  const handleTabPress = (tab: BottomTabType) => {
    try {
      Haptics.selectionAsync();
    } catch (_) {}
    onSelectTab(tab);
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        {/* Tab 1: Home */}
        <TouchableOpacity
          style={styles.tabItem}
          activeOpacity={0.7}
          onPress={() => handleTabPress('home')}
        >
          <Ionicons
            name={currentTab === 'home' ? 'home' : 'home-outline'}
            size={22}
            color={currentTab === 'home' ? '#1E1E1E' : '#99958F'}
          />
          <Text style={[styles.tabLabel, currentTab === 'home' && styles.activeTabLabel]}>
            Home
          </Text>
        </TouchableOpacity>

        {/* Tab 2: Library */}
        <TouchableOpacity
          style={styles.tabItem}
          activeOpacity={0.7}
          onPress={() => handleTabPress('library')}
        >
          <Ionicons
            name={currentTab === 'library' ? 'folder' : 'folder-outline'}
            size={22}
            color={currentTab === 'library' ? '#1E1E1E' : '#99958F'}
          />
          <Text style={[styles.tabLabel, currentTab === 'library' && styles.activeTabLabel]}>
            Library
          </Text>
        </TouchableOpacity>

        {/* Tab 3: Search */}
        <TouchableOpacity
          style={styles.tabItem}
          activeOpacity={0.7}
          onPress={() => handleTabPress('search')}
        >
          <Ionicons
            name={currentTab === 'search' ? 'search' : 'search-outline'}
            size={22}
            color={currentTab === 'search' ? '#1E1E1E' : '#99958F'}
          />
          <Text style={[styles.tabLabel, currentTab === 'search' && styles.activeTabLabel]}>
            Search
          </Text>
        </TouchableOpacity>

        {/* Tab 4: Settings */}
        <TouchableOpacity
          style={styles.tabItem}
          activeOpacity={0.7}
          onPress={() => handleTabPress('settings')}
        >
          <Ionicons
            name={currentTab === 'settings' ? 'settings' : 'settings-outline'}
            size={22}
            color={currentTab === 'settings' ? '#1E1E1E' : '#99958F'}
          />
          <Text style={[styles.tabLabel, currentTab === 'settings' && styles.activeTabLabel]}>
            Settings
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingBottom: 22,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#EFECE4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 4,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#99958F',
    marginTop: 4,
  },
  activeTabLabel: {
    color: '#1E1E1E',
    fontWeight: '700',
  },
});
