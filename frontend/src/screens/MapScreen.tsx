import React from 'react';
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';

export default function MapScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.emoji}>📍</Text>
        <Text style={styles.title}>주변 식당 지도</Text>
        <Text style={styles.subtitle}>추천 메뉴를 바로 드실 수 있는 근처 식당 정보</Text>

        {/* Map Placeholder */}
        <View style={styles.mapCard}>
          <Text style={styles.mapText}>🗺️ 지도 영역 플레이스홀더</Text>
          <Text style={styles.mapSubText}>GPS 신호를 감지하여 주변 위치를 추적합니다.</Text>
        </View>

        {/* Restaurant Quick List */}
        <Text style={styles.sectionTitle}>🍽️ 지금 갈 수 있는 근처 맛집 리스트</Text>
        <ScrollView style={styles.scrollList} showsVerticalScrollIndicator={false}>
          <View style={styles.restaurantItem}>
            <View>
              <Text style={styles.resName}>맛있는 김치찌개 전문점</Text>
              <Text style={styles.resInfo}>한식 • 내 위치에서 250m • ⭐ 4.7</Text>
            </View>
            <TouchableOpacity style={styles.resButton}>
              <Text style={styles.resButtonText}>길찾기</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.restaurantItem}>
            <View>
              <Text style={styles.resName}>차이나 익스프레스 짬뽕</Text>
              <Text style={styles.resInfo}>중식 • 내 위치에서 410m • ⭐ 4.5</Text>
            </View>
            <TouchableOpacity style={styles.resButton}>
              <Text style={styles.resButtonText}>길찾기</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  container: {
    flex: 1,
    padding: 24,
  },
  emoji: {
    fontSize: 48,
    textAlign: 'center',
    marginVertical: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#38bdf8',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 24,
  },
  mapCard: {
    height: 220,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  mapText: {
    color: '#e2e8f0',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  mapSubText: {
    color: '#64748b',
    fontSize: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 12,
  },
  scrollList: {
    flex: 1,
  },
  restaurantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  resName: {
    color: '#f1f5f9',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  resInfo: {
    color: '#94a3b8',
    fontSize: 11,
  },
  resButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  resButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  }
});
