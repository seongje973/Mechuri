import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  FlatList, 
  Platform, 
  Linking, 
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFetch } from '../api/client';
import * as Location from 'expo-location';
import MapView, { Marker, Callout } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radii } from '../theme';

// 카카오 로컬 검색에는 평점이 없어서 평점은 받지도 보여주지도 않는다
interface Restaurant {
  name: string;
  distance?: string;
  category: string;
  url: string;
  address: string;
  type?: string;
  latitude: number;
  longitude: number;
}

const metaLine = (res: Restaurant) => [res.category, res.distance].filter(Boolean).join(' • ');

interface MapScreenProps {
  route?: any;
  navigation?: any;
}

const { width } = Dimensions.get('window');

export default function MapScreen({ route, navigation }: MapScreenProps) {
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [restaurantsList, setRestaurantsList] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationName, setLocationName] = useState<string>('위치 스캔 중...');
  const [activeIndex, setActiveIndex] = useState<number>(0);
  // 서버에서 식당을 못 받아오면 가짜 식당 대신 오류와 다시 시도 버튼을 보여준다
  const [loadError, setLoadError] = useState(false);
  // 개발용 샘플 데이터(RESTAURANT_MOCK)면 실제 식당이 아니라고 표시한다
  const [isSample, setIsSample] = useState(false);

  const mapRef = useRef<MapView>(null);
  const flatListRef = useRef<FlatList>(null);

  // 추천 결과에서 { keyword: 메뉴명, requestedAt } 으로 들어오면 그 메뉴로 다시 찾는다.
  // requestedAt이 바뀌면 같은 메뉴여도 새로 찾는다. 키워드가 없으면 주변 맛집 전체.
  const keyword: string | undefined = route?.params?.keyword?.trim() || undefined;
  const requestedAt = route?.params?.requestedAt;
  const requestIdRef = useRef(0);

  useEffect(() => {
    loadNearbyRestaurants(keyword);
  }, [keyword, requestedAt]);

  // Handle parameters from RecommendScreen
  useEffect(() => {
    if (route?.params?.restaurant) {
      const targetRes = route.params.restaurant as Restaurant;
      console.log('📌 Navigated to MapScreen with selected restaurant:', targetRes.name);
      
      // Add the passed restaurant to the list if not already there, or put it at the front
      setRestaurantsList(prevList => {
        const exists = prevList.some(r => r.name === targetRes.name);
        if (exists) {
          // Reorder to put it first
          const filtered = prevList.filter(r => r.name !== targetRes.name);
          return [targetRes, ...filtered];
        }
        return [targetRes, ...prevList];
      });

      // Animate map and index focus
      setTimeout(() => {
        focusOnRestaurant(targetRes, 0);
      }, 800);
    }
  }, [route?.params?.restaurant]);

  const loadNearbyRestaurants = async (searchKeyword?: string) => {
    // 응답이 늦게 온 이전 검색이 새 검색 결과를 덮어쓰지 않게 한다
    const requestId = ++requestIdRef.current;
    const isStale = () => requestId !== requestIdRef.current;
    setLoading(true);
    setLoadError(false);
    setIsSample(false);
    setActiveIndex(0);
    try {
      let lat = 37.497942; // Gangnam default
      let lng = 127.0276197;

      // GPS가 꺼져 있거나 실패해도 기본 위치로 검색은 계속한다
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (isStale()) return;
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced
          });
          if (isStale()) return;
          setUserCoords({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude
          });
          lat = location.coords.latitude;
          lng = location.coords.longitude;
          setLocationName('내 위치 (실시간 GPS)');
        } else {
          setLocationName('강남역 중심 (권한 미승인)');
        }
      } catch (locationError) {
        if (isStale()) return;
        console.log('⚠️ Location unavailable, searching around default:', locationError);
        setLocationName('강남역 중심 (위치 확인 실패)');
      }

      // Fetch nearby eateries (서버가 반경 1.5km 안에서 찾는다)
      const url = `/api/restaurants?keyword=${encodeURIComponent(searchKeyword || '맛집')}&x=${lng}&y=${lat}`;
      console.log('📡 Fetching maps data:', url);

      const response = await apiFetch(url);
      if (isStale()) return;
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (isStale()) return;
      setRestaurantsList(data.restaurants || []);
      setIsSample(data.mock === true);
      focusRegion(lat, lng);
    } catch (error) {
      if (isStale()) return;
      console.log('❌ MapScreen load failed:', error);
      setRestaurantsList([]);
      setLoadError(true);
    } finally {
      if (!isStale()) setLoading(false);
    }
  };

  // 새로 찾은 결과 쪽으로 지도를 되돌리고 카드 목록을 처음으로 돌린다
  const focusRegion = (lat: number, lng: number) => {
    mapRef.current?.animateToRegion({
      latitude: lat,
      longitude: lng,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02
    }, 400);
    flatListRef.current?.scrollToOffset?.({ offset: 0, animated: false });
  };

  const clearKeyword = () => {
    navigation?.setParams?.({ keyword: undefined, requestedAt: Date.now() });
  };

  const focusOnRestaurant = (res: Restaurant, index: number) => {
    setActiveIndex(index);
    
    // Animate map view camera
    mapRef.current?.animateToRegion({
      latitude: res.latitude,
      longitude: res.longitude,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005
    }, 400);

    // Scroll bottom flatlist to index
    try {
      flatListRef.current?.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0.5
      });
    } catch (e) {
      console.log('Scroll error:', e);
    }
  };

  const handleOpenMap = (res: Restaurant) => {
    if (res.url && res.url.startsWith('http')) {
      Linking.openURL(res.url).catch(() => {
        Linking.openURL(`https://m.map.naver.com/search2/search.naver?query=${encodeURIComponent(res.name)}`);
      });
    } else {
      Linking.openURL(`https://m.map.naver.com/search2/search.naver?query=${encodeURIComponent(res.name)}`);
    }
  };

  const onBottomCardScroll = useRef((event: any) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / (width - 48); // adjust card padding width
    const roundIndex = Math.round(index);
    
    if (roundIndex >= 0 && roundIndex < restaurantsList.length && roundIndex !== activeIndex) {
      setActiveIndex(roundIndex);
      const res = restaurantsList[roundIndex];
      mapRef.current?.animateToRegion({
        latitude: res.latitude,
        longitude: res.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005
      }, 300);
    }
  }).current;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.mainContainer}>
        
        {/* Floating Top Header Bar */}
        <View style={styles.headerBar}>
          <Ionicons name="search" size={18} color={colors.subtle} style={styles.headerIcon} />
          <View style={styles.headerTextBox}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {keyword ? `🍽️ ${keyword} 근처 식당` : `📍 ${locationName}`}
            </Text>
            {keyword ? (
              <Text style={styles.headerSubtitle} numberOfLines={1}>📍 {locationName} · 반경 1.5km</Text>
            ) : null}
          </View>
          {keyword ? (
            <TouchableOpacity style={styles.clearBtn} onPress={clearKeyword} disabled={loading}>
              <Text style={styles.clearBtnText}>전체 맛집</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={() => loadNearbyRestaurants(keyword)}
            disabled={loading}
            accessibilityLabel="새로 찾기"
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.brand} />
            ) : (
              <Ionicons name="refresh" size={20} color={colors.subtle} />
            )}
          </TouchableOpacity>
        </View>

        {/* Dynamic Native Map Area */}
        <View style={styles.mapContainer}>
          {loading && !userCoords ? (
            <View style={styles.mapLoading}>
              <ActivityIndicator size="large" color={colors.brandDeep} />
              <Text style={styles.mapLoadingText}>지도를 로드하고 맛집을 스캔하는 중...</Text>
            </View>
          ) : (
            <MapView
              ref={mapRef}
              style={styles.mapView}
              initialRegion={{
                latitude: userCoords?.latitude || 37.497942,
                longitude: userCoords?.longitude || 127.0276197,
                latitudeDelta: 0.015,
                longitudeDelta: 0.015
              }}
              showsUserLocation={true}
              showsMyLocationButton={true}
            >
              {/* Restaurant Markers */}
              {restaurantsList.map((res, idx) => {
                const isActive = idx === activeIndex;
                return (
                  <Marker
                    key={idx}
                    coordinate={{ latitude: res.latitude, longitude: res.longitude }}
                    onPress={() => focusOnRestaurant(res, idx)}
                  >
                    <View style={[styles.customPin, isActive && styles.activePin]}>
                      <Ionicons name="restaurant" size={15} color={isActive ? colors.onBrand : colors.brand} />
                    </View>
                    
                    <Callout tooltip onPress={() => handleOpenMap(res)}>
                      <View style={styles.calloutBubble}>
                        <Text style={styles.calloutName}>{res.name}</Text>
                        <Text style={styles.calloutMeta}>{metaLine(res)}</Text>
                        <Text style={styles.calloutAddress}>{res.address}</Text>
                        <Text style={styles.calloutLink}>📍 길찾기 ➔</Text>
                      </View>
                    </Callout>
                  </Marker>
                );
              })}
            </MapView>
          )}
        </View>

        {/* Bottom Restaurants Card Panel */}
        <View style={styles.bottomPanel}>
          {!loading && isSample ? (
            <Text style={styles.sampleNotice}>개발용 샘플 데이터예요. 실제 식당이 아니에요.</Text>
          ) : null}
          {!loading && loadError ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>식당 정보를 불러오지 못했어요.</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => loadNearbyRestaurants(keyword)}>
                <Text style={styles.retryBtnText}>다시 시도</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          {!loading && !loadError && restaurantsList.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                {keyword ? `반경 1.5km 안에 ${keyword} 식당이 없어요.` : '주변에서 식당을 찾지 못했어요.'}
              </Text>
            </View>
          ) : null}
          <FlatList
            ref={flatListRef}
            data={restaurantsList}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={width - 32} // snap strictly to card sizes
            decelerationRate="fast"
            contentContainerStyle={styles.cardListContainer}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item, index }) => {
              const isActive = index === activeIndex;
              return (
                <TouchableOpacity 
                  style={[styles.restaurantCard, isActive && styles.activeCard]}
                  onPress={() => focusOnRestaurant(item, index)}
                  activeOpacity={0.9}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
                    {item.type ? <Text style={styles.cardBadge}>{item.type}</Text> : null}
                  </View>
                  
                  <Text style={styles.cardMeta}>{metaLine(item)}</Text>
                  <Text style={styles.cardAddress} numberOfLines={1}>{item.address}</Text>
                  
                  <TouchableOpacity style={styles.findRoadBtn} onPress={() => handleOpenMap(item)}>
                    <Ionicons name="navigate" size={15} color={colors.onBrand} />
                    <Text style={styles.findRoadText}>길찾기</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            }}
            onMomentumScrollEnd={onBottomCardScroll}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  mainContainer: {
    flex: 1,
    position: 'relative',
  },
  headerBar: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    minHeight: 52,
    paddingVertical: 8,
    paddingLeft: 16,
    paddingRight: 6,
    borderRadius: radii.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  headerIcon: {
    marginRight: 10,
  },
  headerTextBox: {
    flex: 1,
    paddingRight: 8,
  },
  headerTitle: {
    fontFamily: fonts.bold,
    color: colors.ink,
    fontSize: 14.5,
  },
  headerSubtitle: {
    fontFamily: fonts.medium,
    color: colors.muted,
    fontSize: 11,
    marginTop: 2,
  },
  clearBtn: {
    backgroundColor: colors.brandSoft,
    borderRadius: radii.full,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 2,
  },
  clearBtnText: {
    fontFamily: fonts.bold,
    color: colors.brandText,
    fontSize: 12,
  },
  emptyCard: {
    marginHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: fonts.medium,
    color: colors.muted,
    fontSize: 13,
  },
  sampleNotice: {
    fontFamily: fonts.bold,
    alignSelf: 'center',
    backgroundColor: colors.surface,
    color: colors.brandText,
    fontSize: 11,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
  },
  retryBtn: {
    marginTop: 12,
    backgroundColor: colors.brand,
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: radii.sm,
  },
  retryBtnText: {
    fontFamily: fonts.bold,
    color: colors.onBrand,
    fontSize: 13,
  },
  refreshBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapContainer: {
    flex: 1,
    width: '100%',
  },
  mapView: {
    flex: 1,
    width: '100%',
  },
  mapLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  mapLoadingText: {
    fontFamily: fonts.medium,
    color: colors.muted,
    marginTop: 12,
    fontSize: 13.5,
  },
  customPin: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.brand,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  activePin: {
    borderColor: colors.surface,
    backgroundColor: colors.brand,
    transform: [{ scale: 1.2 }],
  },
  calloutBubble: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 12,
    width: 220,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  calloutName: {
    fontFamily: fonts.bold,
    color: colors.ink,
    fontSize: 14,
    marginBottom: 4,
    textAlign: 'center',
  },
  calloutMeta: {
    fontFamily: fonts.bold,
    color: colors.brandText,
    fontSize: 11.5,
    marginBottom: 4,
  },
  calloutAddress: {
    fontFamily: fonts.body,
    color: colors.muted,
    fontSize: 10.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  calloutLink: {
    fontFamily: fonts.bold,
    color: colors.brandText,
    fontSize: 11,
    textDecorationLine: 'underline',
  },
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 16,
    backgroundColor: 'transparent',
  },
  cardListContainer: {
    paddingHorizontal: 16,
  },
  restaurantCard: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.surface,
    borderRadius: radii.lg,
    padding: 18,
    width: width - 48,
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 8,
  },
  activeCard: {
    borderColor: colors.brand,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardName: {
    fontFamily: fonts.heavy,
    color: colors.ink,
    fontSize: 17,
    flex: 1,
    paddingRight: 8,
  },
  cardBadge: {
    fontFamily: fonts.bold,
    backgroundColor: colors.brandSoft,
    color: colors.brandText,
    fontSize: 11,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    overflow: 'hidden',
  },
  cardMeta: {
    fontFamily: fonts.medium,
    color: colors.muted,
    fontSize: 12,
    marginBottom: 6,
  },
  cardAddress: {
    fontFamily: fonts.body,
    color: colors.muted,
    fontSize: 11,
    marginBottom: 12,
  },
  findRoadBtn: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: colors.brand,
    minHeight: 46,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  findRoadText: {
    fontFamily: fonts.bold,
    color: colors.onBrand,
    fontSize: 14.5,
  },
});
