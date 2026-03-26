import React from 'react'
import { View, Text } from 'react-native'
import { ScreenContent } from '../components/ScreenContent';

interface Props {}

function AboutScreen(props: Props) {
    const {} = props

    return (
        <ScreenContent title="About" path="/screens/AboutScreen.tsx">
          <View>
            <Text>About Screen</Text>
          </View>
        </ScreenContent>
    )
}

export default AboutScreen

