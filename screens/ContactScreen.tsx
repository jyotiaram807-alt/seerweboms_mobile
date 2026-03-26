import React from 'react'
import { View, Text } from 'react-native'
import { ScreenContent } from '../components/ScreenContent';

interface Props {}

function ContactScreen(props: Props) {
    const {} = props

    return (
        <ScreenContent title="Contact" path="/screens/ContactScreen.tsx">
          <View>
            <Text>Contact Screen</Text>
          </View>
        </ScreenContent>
    )
}

export default ContactScreen

