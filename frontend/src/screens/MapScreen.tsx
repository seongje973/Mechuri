import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  SafeAreaView, 
  TouchableOpacity, 
  FlatList, 
  Platform, 
  Linking, 
  ActivityIndicator,
  Dimensions
} from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker, Callout } from 'react-native-maps';

interface Restaurant {
  name: string;
  rating: string;
  distance: string;
  category: string;
  url: string;
  address: string;
  type: string;
  latitude: number;
  longitude: number;
}

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

  const mapRef = useRef<MapView>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadNearbyRestaurants();
  }, []);

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
  }, [route?.params]);

  const loadNearbyRestaurants = async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      let lat = 37.497942; // Gangnam default
      let lng = 127.0276197;

      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced
        });
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

      // Fetch nearby eateries
      const ip = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
      const url = `http://${ip}:5000/api/restaurants?keyword=${encodeURIComponent('맛집')}&x=${lng}&y=${lat}`;
      console.log('📡 Fetching maps data:', url);

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setRestaurantsList(data.restaurants || []);
      } else {
        setRestaurantsList(getFallbackRestaurants(lat, lng));
      }
    } catch (error) {
      console.log('❌ MapScreen load failed, using fallbacks:', error);
      // Fallback with current position offsets
      const fallbackLat = userCoords?.latitude || 37.497942;
      const fallbackLng = userCoords?.longitude || 127.0276197;
      setRestaurantsList(getFallbackRestaurants(fallbackLat, fallbackLng));
    } finally {
      setLoading(false);
    }
  };

  const getFallbackRestaurants = (lat: number, lng: number): Restaurant[] => {
    return [
      { name: '장수 가마솥 곰탕', rating: '⭐ 4.8', distance: '120m', category: '한식', url: 'https://m.map.kakao.com', address: '서울시 마포구 독막로 12', latitude: lat + 0.0012, longitude: lng - 0.0015, type: '주변 추천' },
      { name: '풍성한 숯불 갈비', rating: '⭐ 4.7', distance: '340m', category: '고기구이', url: 'https://m.map.kakao.com', address: '서울시 마포구 독막로 28', latitude: lat - 0.0018, longitude: lng + 0.0011, type: '인기 매장' },
      { name: '스시 마스터 초밥', rating: '⭐ 4.6', distance: '480m', category: '일식', url: 'https://m.map.kakao.com', address: '서울시 마포구 토정로 45', latitude: lat + 0.0009, longitude: lng + 0.0017, type: '리뷰 인기' },
      { name: '나폴리 화덕 피자', rating: '⭐ 4.5', distance: '650m', category: '양식', url: 'https://m.map.kakao.com', address: '서울시 마포구 와우산로 88', latitude: lat - 0.0014, longitude: lng - 0.0013, type: '데이트 명소' },
    ];
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
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.mainContainer}>
        
        {/* Floating Top Header Bar */}
        <View style={styles.headerBar}>
          <Text style={styles.headerTitle}>📍 {locationName}</Text>
          <TouchableOpacity style={styles.refreshBtn} onPress={loadNearbyRestaurants} disabled={loading}>
            <Text style={styles.refreshBtnText}>{loading ? '...' : '🔄'}</Text>
          </TouchableOpacity>
        </View>

        {/* Dynamic Native Map Area */}
        <View style={styles.mapContainer}>
          {loading && !userCoords ? (
            <View style={styles.mapLoading}>
              <ActivityIndicator size="large" color="#fbbf24" />
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
                      <Text style={styles.pinEmoji}>🍔</Text>
                    </View>
                    
                    <Callout tooltip onPress={() => handleOpenMap(res)}>
                      <View style={styles.calloutBubble}>
                        <Text style={styles.calloutName}>{res.name}</Text>
                        <Text style={styles.calloutMeta}>{res.category} • {res.rating}</Text>
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
                    <Text style={styles.cardBadge}>{item.type}</Text>
                  </View>
                  
                  <Text style={styles.cardMeta}>{item.category} • {item.distance} • {item.rating}</Text>
                  <Text style={styles.cardAddress} numberOfLines={1}>{item.address}</Text>
                  
                  <TouchableOpacity style={styles.findRoadBtn} onPress={() => handleOpenMap(item)}>
                    <Text style={styles.findRoadText}>길찾기 ➔</Text>
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
    backgroundColor: '#1c1917',
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
    backgroundColor: 'rgba(41, 37, 36, 0.9)', // Onyx dark style
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  headerTitle: {
    color: '#fbbf24',
    fontWeight: '800',
    fontSize: 13.5,
  },
  refreshBtn: {
    padding: 2,
  },
  refreshBtnText: {
    fontSize: 14,
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
    backgroundColor: '#1c1917',
  },
  mapLoadingText: {
    color: '#a8a29e',
    marginTop: 12,
    fontSize: 13.5,
    fontWeight: '600',
  },
  customPin: {
    backgroundColor: 'rgba(41, 37, 36, 0.9)',
    borderWidth: 1.5,
    borderColor: '#a8a29e',
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
    borderColor: '#fbbf24',
    backgroundColor: '#fbbf24',
    transform: [{ scale: 1.15 }],
  },
  pinEmoji: {
    fontSize: 16,
  },
  calloutBubble: {
    backgroundColor: '#1c1917',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#fbbf24',
    padding: 12,
    width: 220,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  calloutName: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
    marginBottom: 4,
    textAlign: 'center',
  },
  calloutMeta: {
    color: '#fbbf24',
    fontWeight: '700',
    fontSize: 11.5,
    marginBottom: 4,
  },
  calloutAddress: {
    color: '#a8a29e',
    fontSize: 10.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  calloutLink: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '800',
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
    backgroundColor: 'rgba(41, 37, 36, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    padding: 16,
    width: width - 48,
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  activeCard: {
    borderColor: 'rgba(251, 191, 36, 0.4)',
    borderWidth: 1.5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardName: {
    color: '#ffffff',
    fontSize: 15.5,
    fontWeight: '900',
    flex: 1,
    paddingRight: 8,
  },
  cardBadge: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    color: '#fbbf24',
    fontSize: 9.5,
    fontWeight: '800',
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 6,
  },
  cardMeta: {
    color: '#a8a29e',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  cardAddress: {
    color: '#78716c',
    fontSize: 11,
    marginBottom: 12,
  },
  findRoadBtn: {
    backgroundColor: '#fbbf24',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  findRoadText: {
    color: '#1c1917',
    fontSize: 13,
    fontWeight: '800',
  }
});
