import HomeScreen from "../src/screens/HomeScreen"
import { NavigationContainer } from "@react-navigation/native"
import { createStackNavigator } from "@react-navigation/stack"
import ARScreen from "../src/screens/ARScreen"

// Definición de tipos para el stack de navegación
type RootStackParamList = {
  Home: undefined
  AR: { datosMeteo: any; ubicacion: any }
}

const Stack = createStackNavigator<RootStackParamList>()

// Componente principal que configura la navegación
export default function App() {
  return (
    <NavigationContainer>
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
