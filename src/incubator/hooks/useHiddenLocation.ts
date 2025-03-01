import {RefObject, useCallback, useState} from 'react';
import {View, LayoutChangeEvent} from 'react-native';
import {Constants} from 'helpers';

export type Direction = 'top' | 'bottom' | 'left' | 'right';
export interface HiddenLocation {
  isDefault: boolean;
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface HiddenLocationProps<T extends View> {
  containerRef: RefObject<T>;
}

export default function useHiddenLocation<T extends View>(props: HiddenLocationProps<T>) {
  const {containerRef} = props;

  const getHiddenLocation = ({
    x = 0,
    y = 0,
    width = Constants.screenWidth,
    height = Constants.windowHeight,
    isDefault = true
  }) => {
    return {
      top: -y - height,
      bottom: Constants.windowHeight - y,
      left: -width - x,
      right: Constants.screenWidth - x,
      isDefault
    };
  };

  const [hiddenLocation, setHiddenLocation] = useState<HiddenLocation>(getHiddenLocation({}));

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const {width, height} = event.nativeEvent.layout;
    if (containerRef.current) {
      containerRef.current.measureInWindow((x: number, y: number) => {
        setHiddenLocation(getHiddenLocation({x, y, width, height, isDefault: false}));
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {onLayout, hiddenLocation};
}
