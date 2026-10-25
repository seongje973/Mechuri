import { createNavigationContainerRef } from '@react-navigation/native';

/** 화면 밖(딥링크 처리 등)에서 화면을 옮길 때 쓴다 */
export const navigationRef = createNavigationContainerRef<any>();
