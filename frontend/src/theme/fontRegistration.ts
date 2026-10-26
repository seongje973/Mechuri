import { NotoSansKR_400Regular } from '@expo-google-fonts/noto-sans-kr/400Regular';
import { NotoSansKR_500Medium } from '@expo-google-fonts/noto-sans-kr/500Medium';
import { NotoSansKR_700Bold } from '@expo-google-fonts/noto-sans-kr/700Bold';
import { NotoSansKR_800ExtraBold } from '@expo-google-fonts/noto-sans-kr/800ExtraBold';
import { NotoSansKR_900Black } from '@expo-google-fonts/noto-sans-kr/900Black';
import { fonts } from './typography';

/** App.tsx가 useFonts에 넘기는 글꼴. 키가 곧 fontFamily 이름이다 */
export const fontRegistration = {
  [fonts.display]: NotoSansKR_900Black,
  [fonts.heavy]: NotoSansKR_800ExtraBold,
  [fonts.body]: NotoSansKR_400Regular,
  [fonts.medium]: NotoSansKR_500Medium,
  [fonts.bold]: NotoSansKR_700Bold,
};
