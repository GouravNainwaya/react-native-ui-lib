import React, {PureComponent} from 'react';
import {StyleSheet, Animated, Easing, LayoutAnimation, StyleProp, ViewStyle, LayoutChangeEvent} from 'react-native';
import {Constants} from '../../helpers';
import {Colors} from '../../style';
import View, {ViewProps} from '../view';
import TouchableOpacity from '../touchableOpacity';
import Button, {ButtonSize, ButtonProps} from '../button';
import Card from '../card';
import {asBaseComponent} from '../../commons/new';

const PEEP = 8;
const DURATION = 300;
const MARGIN_BOTTOM = 24;
const buttonStartValue = 0.8;
const icon = require('./assets/arrow-down.png');

export type StackAggregatorProps = ViewProps & {
   /**
     * The initial state of the stack
     */
    collapsed: boolean;
    /**
     * Component Children
     */
     children: JSX.Element | JSX.Element[]
    /**
     * The container style
     */
    containerStyle?: StyleProp<ViewStyle>;
    /**
     * The content container style
     */
    contentContainerStyle?: StyleProp<ViewStyle>;
    /**
     * The items border radius
     */
    itemBorderRadius?: number;
    /**
     * Props passed to the 'show less' button
     */
    buttonProps?: ButtonProps;
    /**
     * A callback for item press
     */
    onItemPress?: (index: number) => void;
    /**
     * A callback for collapse state will change (value is future collapsed state)
     */
    onCollapseWillChange?: (changed: boolean) => void;
    /**
     * A callback for collapse state change (value is collapsed state)
     */
    onCollapseChanged?: (changed: boolean) => void;
    /**
     * A setting that disables pressability on cards
     */
    disablePresses?: boolean;
};


type State = {
  collapsed: boolean;
  firstItemHeight?: number;
};

/**
 * @description: Stack aggregator component
 * @modifiers: margin, padding
 * @example: https://github.com/wix/react-native-ui-lib/blob/master/demo/src/screens/componentScreens/StackAggregatorScreen.tsx
 */
class StackAggregator extends PureComponent<StackAggregatorProps, State> {
  static displayName = 'StackAggregator';

  animatedScale: Animated.Value;
  animatedOpacity: any;
  animatedContentOpacity: any;
  itemsCount = React.Children.count(this.props.children);
  easeOut = Easing.bezier(0, 0, 0.58, 1);
  animatedScaleArray: Animated.Value[];

  static defaultProps = {
    disablePresses: false,
    collapsed: true,
    itemBorderRadius: 0
  };

  constructor(props: StackAggregatorProps) {
    super(props);
    this.state = {
      collapsed: props.collapsed,
      firstItemHeight: undefined
    };
    this.animatedScale = new Animated.Value(this.state.collapsed ? buttonStartValue : 1);
    this.animatedOpacity = new Animated.Value(this.state.collapsed ? buttonStartValue : 1);
    this.animatedContentOpacity = new Animated.Value(this.state.collapsed ? 0 : 1);
    this.animatedScaleArray = this.getAnimatedScales();
  }

  componentDidUpdate(_prevProps: StackAggregatorProps, prevState: State) {
    if (prevState.collapsed !== this.state?.collapsed) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
  }

  getAnimatedScales = () => {
    return React.Children.map(this.props.children, (_item, index) => {
      return new Animated.Value(this.getItemScale(index));
    }) as Animated.Value[];
  }

  getItemScale = (index: number) => {
    if (this.state.collapsed) {
      if (index === this.itemsCount - 2) {
        return 0.95;
      }
      if (index === this.itemsCount - 1) {
        return 0.9;
      }
    }
    return 1;
  }

  animate = async () => {
    return Promise.all([this.animateValues(), this.animateCards()]);
  };

  animateValues() {
    const {collapsed} = this.state;
    const newValue = collapsed ? buttonStartValue : 1;
    return new Promise(resolve => {
      Animated.parallel([
        Animated.timing(this.animatedOpacity, {
          duration: DURATION,
          toValue: Number(newValue),
          useNativeDriver: true
        }),
        Animated.timing(this.animatedScale, {
          toValue: Number(newValue),
          easing: this.easeOut,
          duration: DURATION,
          useNativeDriver: true
        }),
        Animated.timing(this.animatedContentOpacity, {
          toValue: Number(collapsed ? 0 : 1),
          easing: this.easeOut,
          duration: DURATION,
          useNativeDriver: true
        })
      ]).start(resolve);
    });
  }

  animateCards() {
    const promises = [];
    for (let index = 0; index < this.itemsCount; index++) {
      const newScale = this.getItemScale(index);

      promises.push(
        new Promise(resolve => {
          Animated.timing(this.animatedScaleArray[index], {
            toValue: Number(newScale),
            easing: this.easeOut,
            duration: DURATION,
            useNativeDriver: true
          }).start(resolve);
        })
      );
    }
    return Promise.all(promises);
  }

  close = () => {
    this.setState({collapsed: true}, async () => {
      this.props.onCollapseWillChange?.(true);
      if (this.props.onCollapseChanged) {
        await this.animate();
        this.props.onCollapseChanged(true);
      } else {
        this.animate();
      }
    });
  };

  open = () => {
    this.setState({collapsed: false}, async () => {
      this.props.onCollapseWillChange?.(false);
      if (this.props.onCollapseChanged) {
        await this.animate();
        this.props.onCollapseChanged(false);
      } else {
        this.animate();
      }
    });
  };

  getTop(index: number) {
    let start = 0;

    if (index === this.itemsCount - 2) {
      start += PEEP;
    }
    if (index === this.itemsCount - 1) {
      start += PEEP * 2;
    }

    return start;
  }

  getStyle(index: number): StyleProp<ViewStyle> {
    const {collapsed} = this.state;
    const top = this.getTop(index);

    if (collapsed) {
      return {
        position: index !== 0 ? 'absolute' : undefined,
        top
      };
    }
    return {
      marginBottom: MARGIN_BOTTOM,
      marginTop: index === 0 ? 40 : undefined
    };
  }

  onLayout = (event: LayoutChangeEvent) => {
    const height = event.nativeEvent.layout.height;

    if (height) {
      this.setState({firstItemHeight: height});
    }
  };

  onItemPress = (index: number) => {
    this.props.onItemPress?.(index);
  };

  renderItem = (item: JSX.Element | JSX.Element[], index: number) => {
    const {contentContainerStyle, itemBorderRadius} = this.props;
    const {firstItemHeight, collapsed} = this.state;

    return (
      <Animated.View
        key={index}
        onLayout={index === 0 ? this.onLayout : undefined}
        style={[
          Constants.isIOS && styles.containerShadow,
          this.getStyle(index),
          {
            borderRadius: Constants.isIOS ? itemBorderRadius : undefined,
            alignSelf: 'center',
            zIndex: this.itemsCount - index,
            transform: [{scaleX: this.animatedScaleArray[index]}],
            width: Constants.screenWidth - 40,
            height: collapsed ? firstItemHeight : undefined
          }
        ]}
        collapsable={false}
      >
        <Card
          style={[contentContainerStyle, styles.card]}
          onPress={() => this.props.disablePresses && this.onItemPress(index)}
          borderRadius={itemBorderRadius}
          elevation={5}
        >
          <Animated.View style={index !== 0 ? {opacity: this.animatedContentOpacity} : undefined} collapsable={false}>
            {item}
          </Animated.View>
        </Card>
      </Animated.View>
    );
  };

  render() {
    const {children, containerStyle, buttonProps} = this.props;
    const {collapsed, firstItemHeight} = this.state;

    return (
      <View style={containerStyle}>
        <View style={{marginBottom: PEEP * 3}}>
          <Animated.View
            style={{
              position: 'absolute',
              right: 0,
              opacity: this.animatedOpacity,
              transform: [{scale: this.animatedScale}]
            }}
          >
            <Button
              label={'Show less'}
              iconSource={icon}
              link
              size={ButtonSize.small}
              {...buttonProps}
              marginH-24
              marginB-20
              onPress={this.close}
            />
          </Animated.View>

          {React.Children.map(children, (item, index) => {
            return this.renderItem(item as JSX.Element | JSX.Element[], index);
          })}

          {collapsed && (
            <TouchableOpacity
              onPress={this.open}
              activeOpacity={1}
              style={[
                styles.touchable,
                {
                  height: firstItemHeight ? firstItemHeight + PEEP * 2 : undefined,
                  zIndex: this.itemsCount
                }
              ]}
            />
          )}
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  touchable: {
    position: 'absolute',
    width: '100%'
  },
  containerShadow: {
    backgroundColor: Colors.white,
    shadowColor: Colors.grey40,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: {height: 5, width: 0}
  },
  card: {
    overflow: 'hidden',
    flexShrink: 1
  }
});

export default asBaseComponent<StackAggregatorProps>(StackAggregator);
