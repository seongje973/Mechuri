import React from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  ScrollView, 
  SafeAreaView, 
  Platform 
} from 'react-native';

interface HomeScreenProps {
  navigation: any;
}

export default function HomeScreen({ navigation }: HomeScreenProps) {
  // Simple check for time of day to display dynamic greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 11) return '상쾌한 아침, 오늘 첫 끼는?';
    if (hour < 15) return '즐거운 점심, 오늘 점심 뭐 먹지?';
    if (hour < 18) return '출출한 오후, 맛있는 간식 타임?';
    return '행복한 저녁, 오늘 저녁은 결정하셨나요?';
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.appTitle}>🍲 메추리</Text>
            <Text style={styles.greeting}>{getGreeting()}</Text>
          </View>
          <TouchableOpacity 
            style={styles.profileBadge}
            onPress={() => navigation.navigate('마이페이지')}
          >
            <Text style={styles.profileEmoji}>😋</Text>
          </TouchableOpacity>
        </View>

        {/* Banner Card / Shortcut Recommendation */}
        <View style={styles.glassCard}>
          <View style={styles.bannerRow}>
            <Text style={styles.bannerBadge}>오늘의 추천 테마 🌧️</Text>
          </View>
          <Text style={styles.bannerTitle}>비 오는 날엔 역시 따뜻한 국물 요리!</Text>
          <Text style={styles.bannerDesc}>
            오늘 같이 흐리고 비가 오는 날에는 칼칼하고 따뜻한 김치찌개나 짬뽕 어떠신가요?
          </Text>
          <TouchableOpacity 
            style={styles.bannerButton}
            onPress={() => navigation.navigate('메뉴 추천')}
          >
            <Text style={styles.bannerButtonText}>추천 메뉴 더 보기</Text>
          </TouchableOpacity>
        </View>

        {/* Section: Core Features */}
        <Text style={styles.sectionTitle}>🎯 결정 장애 해결소</Text>

        <View style={styles.row}>
          {/* Roulette Card */}
          <TouchableOpacity 
            style={[styles.featureCard, styles.purpleCard]} 
            onPress={() => navigation.navigate('메뉴 추천')}
            activeOpacity={0.8}
          >
            <Text style={styles.featureEmoji}>🍔</Text>
            <Text style={styles.featureTitle}>메뉴 추천 서비스</Text>
            <Text style={styles.featureDesc}>룰렛, 퀴즈, 월드컵으로 완벽한 한 끼 선택!</Text>
            <View style={styles.actionArrow}>
              <Text style={styles.arrowText}>→</Text>
            </View>
          </TouchableOpacity>

          {/* Map Card */}
          <TouchableOpacity 
            style={[styles.featureCard, styles.orangeCard]} 
            onPress={() => navigation.navigate('지도')}
            activeOpacity={0.8}
          >
            <Text style={styles.featureEmoji}>📍</Text>
            <Text style={styles.featureTitle}>주변 식당 지도</Text>
            <Text style={styles.featureDesc}>추천받은 맛집을 즉시 지도에서 확인!</Text>
            <View style={styles.actionArrow}>
              <Text style={styles.arrowText}>→</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Mood Shortcuts */}
        <Text style={styles.sectionTitle}>🔥 지금 내 상태는?</Text>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
          <TouchableOpacity style={styles.moodChip} onPress={() => navigation.navigate('메뉴 추천')}>
            <Text style={styles.moodEmoji}>🌶️</Text>
            <Text style={styles.moodText}>매운 게 당겨</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.moodChip} onPress={() => navigation.navigate('메뉴 추천')}>
            <Text style={styles.moodEmoji}>🥗</Text>
            <Text style={styles.moodText}>가볍게 먹고파</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.moodChip} onPress={() => navigation.navigate('메뉴 추천')}>
            <Text style={styles.moodEmoji}>💸</Text>
            <Text style={styles.moodText}>가성비 최고</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.moodChip} onPress={() => navigation.navigate('메뉴 추천')}>
            <Text style={styles.moodEmoji}>🥩</Text>
            <Text style={styles.moodText}>플렉스 할래</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* History / Analytics Quick Preview */}
        <TouchableOpacity 
          style={styles.historyPreviewCard}
          onPress={() => navigation.navigate('마이페이지')}
        >
          <View style={styles.historyRow}>
            <View>
              <Text style={styles.historyTitle}>📅 최근에 먹은 메뉴 & 마이페이지</Text>
              <Text style={styles.historyDesc}>식사 히스토리를 확인하고 취향을 관리해 보세요.</Text>
            </View>
            <Text style={styles.historyArrow}>➔</Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.footer}>MeChuri - premium food recommendation app</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  container: {
    padding: 20,
    paddingTop: Platform.OS === 'android' ? 20 : 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  appTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#38bdf8',
    letterSpacing: 1,
  },
  greeting: {
    fontSize: 15,
    color: '#cbd5e1',
    marginTop: 4,
    fontWeight: '500',
  },
  profileBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  profileEmoji: {
    fontSize: 22,
  },
  glassCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.75)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 10,
  },
  bannerRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  bannerBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  bannerTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 8,
  },
  bannerDesc: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 20,
    marginBottom: 18,
  },
  bannerButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  bannerButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  featureCard: {
    width: '48%',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  purpleCard: {
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    borderColor: 'rgba(124, 58, 237, 0.25)',
  },
  orangeCard: {
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    borderColor: 'rgba(249, 115, 22, 0.25)',
  },
  featureEmoji: {
    fontSize: 28,
    marginBottom: 10,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 6,
  },
  featureDesc: {
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 16,
    height: 48,
  },
  actionArrow: {
    alignSelf: 'flex-end',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  arrowText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  horizontalScroll: {
    paddingRight: 20,
    marginBottom: 32,
  },
  moodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  moodEmoji: {
    fontSize: 16,
    marginRight: 8,
  },
  moodText: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '600',
  },
  historyPreviewCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 24,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#e2e8f0',
    marginBottom: 4,
  },
  historyDesc: {
    fontSize: 11,
    color: '#64748b',
  },
  historyArrow: {
    color: '#94a3b8',
    fontSize: 16,
  },
  footer: {
    textAlign: 'center',
    color: '#334155',
    fontSize: 11,
    marginVertical: 10,
  }
});
