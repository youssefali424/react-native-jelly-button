import * as React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import JellyButton from 'react-native-jelly-button';

export default function App() {
  return (
    <View style={styles.container}>
      <JellyButton
        height={50}
        width={200}
        gradientStart={'#219D72'}
        gradientEnd={'#C3E87F'}
        borderRadius={50}
      >
        <View>
          <Text style={{ color: 'white', fontSize: 20 }}>{'Click me'}</Text>
        </View>
      </JellyButton>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
