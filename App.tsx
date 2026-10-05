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
import * as Linking from 'expo-linking';
import { AppRoute, ScreenshotRow } from './src/types';
import { Colors } from './src/theme/tokens';
import { initDatabase } from './src/db';
import { processIncomingShareIntent } from './src/utils';

export default function App() {
  const [currentRoute, setCurrentRoute] = useState<AppRoute>('home');
  const [currentTab, setCurrentTab] = useState<BottomTabType>('home');
  const [isDbReady, setIsDbReady] = useState(false);
  const [activeScreenshot, setActiveScreenshot] = useState<ScreenshotRow | null>(null);
  const [activeBatch, setActiveBatch] = useState<ScreenshotRow[]>([]);
  const [intentError, setIntentError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const handleUrl = async (url: string | null) => {
      if (!url || !isMounted) return;
      const result = await processIncomingShareIntent(url);
      if (!isMounted) return;

      if (result.success && result.screenshot) {
        setActiveScreenshot(result.screenshot);
        setActiveBatch(result.batch ?? [result.screenshot]);
        setIntentError(null);
        setCurrentRoute('analyze');
      } else if (result.error) {
        setActiveScreenshot(null);
        setActiveBatch([]);
        setIntentError(result.error);
        setCurrentRoute('analyze');
      }
    };

    // 1. Initialize SQLite Database & check initial URL
    initDatabase()
      .then(async () => {
        if (!isMounted) return;
        setIsDbReady(true);

        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          await handleUrl(initialUrl);
        }
      })
      .catch((err) => {
        console.error('Failed to initialize database:', err);
        if (isMounted) setIsDbReady(true);
      });

    // 2. Listen for URL events while running
    const subscription = Linking.addEventListener('url', (event) => {
      handleUrl(event.url);
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
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
          intentError={intentError}
          onClearError={() => setIntentError(null)}
          onScreenshotSelected={(sc) => {
            setActiveScreenshot(sc);
            setIntentError(null);
          }}
        />
      )}

      {currentRoute === 'manga' && (
        <MangaScreen onBack={handleBackToHome} />
      )}

      {currentRoute === 'library' && (
        <LibraryScreen
          onSelectScreenshot={(sc) => handleOpenAnalyze(sc, [sc])}
        />
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
