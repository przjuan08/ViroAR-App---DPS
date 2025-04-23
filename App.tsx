/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * Generated with the TypeScript template
 * https://github.com/react-native-community/react-native-template-typescript
 *
 * @format
 */

"use client"

import { useEffect } from "react"
import { NavigationContainer } from "@react-navigation/native"
import { createStackNavigator } from "@react-navigation/stack"
import { StatusBar, LogBox } from "react-native"

// Importar pantallas
import HomeScreen from "./src/screens/HomeScreen"
import ARScreen from "./src/screens/ARScreen"

// Definición de tipos para TypeScript
type RootStackParamList = {
  Home: undefined
  AR: { datosMeteo: any; ubicacion: any }
}

// Crear el navegador de stack para manejar las pantallas
const Stack = createStackNavigator<RootStackParamList>()

// Ignorar advertencias específicas que no afectan la funcionalidad
LogBox.ignoreLogs([
  "Possible Unhandled Promise Rejection",
  "ViewPropTypes will be removed",
  "AsyncStorage has been extracted",
  "ViroReact: Can't find variable: WebXRPolyfill", // Advertencia común de ViroReact
])

export default function App() {
  // Verificar si el dispositivo es compatible con AR
  useEffect(() => {
    // En un caso real, aquí verificaríamos la compatibilidad con AR
    // Por ejemplo, usando ViroUtils.checkARSupported() si estuviera disponible
    console.log("Verificando compatibilidad con AR...")
  }, [])

  return (
    <NavigationContainer>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{
            title: "Monitor Meteorológico AR",
            headerStyle: {
              backgroundColor: "#0066CC",
            },
            headerTintColor: "#fff",
            headerTitleStyle: {
              fontWeight: "bold",
            },
          }}
        />
        <Stack.Screen
          name="AR"
          component={ARScreen}
          options={{
            title: "Visualización AR",
            headerShown: false, // Ocultamos el header para una mejor experiencia AR
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  )
}
