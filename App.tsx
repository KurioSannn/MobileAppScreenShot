import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { BottomTabBar, BottomTabType } from './src/components/BottomTabBar';
import { HomeScreen } from './src/features/home/HomeScreen';
import { AnalyzeScreen } from './src/features/analyze/AnalyzeScreen';
import { MangaScreen } from './src/features/manga/MangaScreen';
import { LibraryScreen } from './src/features/library/LibraryScreen';
import { SearchScreen } from './src/features/search/SearchScreen';
import { SettingsScreen } from './src/features/settings/SettingsScreen';
import { AppRoute } from './src/types';
import { Colors } from './src/theme/tokens';
import { initDatabase } from './src/db';

export default function App() {
  const [currentRoute, setCurrentRoute] = useState<AppRoute>('home');
  const [currentTab, setCurrentTab] = useState<BottomTabType>('home');
  const [isDbReady, setIsDbReady] = useState(false);
  const [activeScreenshot, setActiveScreenshot] = useState<any>(null);
  const [activeBatch, setActiveBatch] = useState<any[]>([]);

  useEffect(() => {
    initDatabase()
      .then(() => {
        setIsDbReady(true);
      })
      .catch((err) => {
        console.error('Failed to initialize database:', err);
        setIsDbReady(true);
      });
  }, []);

  const handleSelectTab = (tab: BottomTabType) => {
    setCurrentTab(tab);
    setCurrentRoute(tab);
  };

  const handleOpenAnalyze = (screenshot?: any, batch?: any[]) => {
    if (screenshot) {
      setActiveScreenshot(screenshot);
    }
    if (batch && batch.length > 0) {
      setActiveBatch(batch);
    }
    setCurrentRoute('analyze');
  };

  const handleOpenManga = () => {
    setCurrentRoute('manga');
  };

  const handleBackToHome = () => {
    setCurrentRoute('home');
    setCurrentTab('home');
  };

  // Determine if bottom tab bar should be visible (hidden in full-screen modes like Analyze & Manga)
  const isTabVisible = currentRoute !== 'analyze' && currentRoute !== 'manga';

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Screen Views */}
      {currentRoute === 'home' && (
        <HomeScreen
          onNavigateToAnalyze={handleOpenAnalyze}
          onNavigateToManga={handleOpenManga}
          onNavigateToSearch={() => handleSelectTab('search')}
          onNavigateToLibrary={() => handleSelectTab('library')}
        />
      )}

      {currentRoute === 'analyze' && (
        <AnalyzeScreen
          onBack={handleBackToHome}
          onOpenMangaMode={handleOpenManga}
          initialScreenshot={activeScreenshot}
          initialBatch={activeBatch}
          onScreenshotSelected={(sc) => setActiveScreenshot(sc)}
        />
      )}

      {currentRoute === 'manga' && (
        <MangaScreen onBack={handleBackToHome} />
      )}

      {currentRoute === 'library' && (
        <LibraryScreen />
      )}

      {currentRoute === 'search' && (
        <SearchScreen />
      )}

      {currentRoute === 'settings' && (
        <SettingsScreen />
      )}

      {/* Bottom Navigation: Home, Library, Search, Settings (Manga is NOT a bottom tab) */}
      {isTabVisible && (
        <BottomTabBar
          currentTab={currentTab}
          onSelectTab={handleSelectTab}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
