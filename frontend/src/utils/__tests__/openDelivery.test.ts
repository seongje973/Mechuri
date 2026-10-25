import { Linking } from 'react-native';
import { BAEMIN_WEB_URL, baeminAppUrl, openDelivery } from '../openDelivery';

describe('openDelivery (US-20)', () => {
  afterEach(() => jest.restoreAllMocks());

  it('배민 앱이 있으면 앱 검색을 연다', async () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    await expect(openDelivery('떡볶이')).resolves.toBe('app');
    expect(open).toHaveBeenCalledWith(baeminAppUrl('떡볶이'));
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('배민 앱이 없으면 오류 없이 웹을 연다', async () => {
    const open = jest
      .spyOn(Linking, 'openURL')
      .mockRejectedValueOnce(new Error('No app'))
      .mockResolvedValueOnce(true);
    await expect(openDelivery('떡볶이')).resolves.toBe('web');
    expect(open).toHaveBeenLastCalledWith(BAEMIN_WEB_URL);
  });

  it('웹도 못 열면 failed', async () => {
    jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('nope'));
    await expect(openDelivery('떡볶이')).resolves.toBe('failed');
  });
});
