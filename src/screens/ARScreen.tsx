"use client"

// Importaciones necesarias
import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { StyleSheet, View, Text, TouchableOpacity, Alert, Dimensions, Platform, Linking } from "react-native"
import { check, request, PERMISSIONS, RESULTS } from "react-native-permissions"
import type { StackNavigationProp } from "@react-navigation/stack"
import type { RouteProp } from "@react-navigation/native"
import { BlurView } from "@react-native-community/blur"
import ReactNativeHapticFeedback from "react-native-haptic-feedback"
import {
  ViroARScene,
  ViroARSceneNavigator,
  ViroText,
  ViroFlexView,
  ViroNode,
  ViroAnimations,
} from "@viro-community/react-viro"
import { obtenerDatosMeteorologicos, type DatosMeteorologicos } from "../services/api"
import type { GeoPosition } from "react-native-geolocation-service"

// Definición de tipos para TypeScript
type RootStackParamList = {
  Home: undefined
  AR: { datosMeteo: DatosMeteorologicos; ubicacion: GeoPosition }
}

type ARScreenNavigationProp = StackNavigationProp<RootStackParamList, "AR">
type ARScreenRouteProp = RouteProp<RootStackParamList, "AR">

interface ARScreenProps {
  navigation: ARScreenNavigationProp
  route: ARScreenRouteProp
}

// Reemplazar la definición de GeolocationPosition por GeoPosition
type GeolocationPosition = GeoPosition

// Opciones para el feedback háptico
const hapticOptions = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
}

// Componente principal de la pantalla AR
const ARScreen: React.FC<ARScreenProps> = ({ route, navigation }) => {
  // Obtener datos pasados desde la pantalla anterior
  const { datosMeteo: datosIniciales, ubicacion: ubicacionInicial } = route.params

  // Estados para manejar los datos y la UI
  const [datosMeteo, setDatosMeteo] = useState<DatosMeteorologicos>(datosIniciales)
  const [cargando, setCargando] = useState<boolean>(false)
  const [ubicacion, setUbicacion] = useState<GeoPosition>(ubicacionInicial)
  const [tienePermisoCamara, setTienePermisoCamara] = useState<boolean | null>(null)

  // Materiales para los componentes AR
  const [arMaterials, setArMaterials] = useState({
    panelMaterial: {
      diffuseColor: "rgba(0,0,0,0.5)",
      lightingModel: "Blinn",
    },
    infoPanelMaterial: {
      diffuseColor: "rgba(255,255,255,0.2)",
      lightingModel: "Blinn",
    },
    anchorButtonMaterial: {
      diffuseColor: "rgba(0,102,204,0.5)",
      lightingModel: "Blinn",
    },
    updateButtonMaterial: {
      diffuseColor: "rgba(0,153,51,0.5)",
      lightingModel: "Blinn",
    },
    transparentMaterial: {
      diffuseColor: "rgba(0,0,0,0)",
      lightingModel: "Blinn",
    },
  })

  // Referencia para controlar si los datos se están actualizando
  const isUpdatingData = useRef<boolean>(false)

  // Referencia para el intervalo de actualización
  // Cambiamos el tipo para evitar el error de NodeJS.Timeout
  const updateIntervalRef = useRef<number | null>(null)

  // Verificar permisos de cámara al montar el componente
  useEffect(() => {
    const verificarPermisoCamara = async () => {
      try {
        const permiso = Platform.OS === "ios" ? PERMISSIONS.IOS.CAMERA : PERMISSIONS.ANDROID.CAMERA

        const resultado = await check(permiso)

        if (resultado === RESULTS.GRANTED) {
          setTienePermisoCamara(true)
          return
        }

        const solicitudResultado = await request(permiso)
        setTienePermisoCamara(solicitudResultado === RESULTS.GRANTED)
      } catch (error) {
        console.error("Error al verificar permisos de cámara:", error)
        setTienePermisoCamara(false)
      }
    }

    verificarPermisoCamara()
  }, [])

  // Función para actualizar los datos meteorológicos
  const actualizarDatosMeteorologicos = useCallback(async () => {
    if (!ubicacion || isUpdatingData.current) {
      return
    }

    try {
      // Marcar que estamos actualizando para evitar actualizaciones simultáneas
      isUpdatingData.current = true
      setCargando(true)

      // Obtener datos en segundo plano
      const datos = await obtenerDatosMeteorologicos(ubicacion.coords.latitude, ubicacion.coords.longitude)

      // Actualizar el estado
      setDatosMeteo(datos)

      // Feedback háptico sutil
      try {
        ReactNativeHapticFeedback.trigger("impactLight", hapticOptions)
      } catch (error) {
        console.log("Haptics no disponible:", error)
      }
    } catch (error) {
      console.error("Error al obtener datos meteorológicos:", error)
    } finally {
      setCargando(false)
      // Desmarcar la actualización después de un pequeño retraso
      setTimeout(() => {
        isUpdatingData.current = false
      }, 300)
    }
  }, [ubicacion])

  // Configurar actualización periódica de datos
  useEffect(() => {
    // Actualizar datos inicialmente
    actualizarDatosMeteorologicos()

    // Configurar intervalo para actualización periódica
    // Usamos setInterval y guardamos el ID devuelto
    const intervalId = setInterval(() => {
      if (!isUpdatingData.current) {
        actualizarDatosMeteorologicos()
      }
    }, 10000)

    updateIntervalRef.current = intervalId

    // Limpiar intervalo al desmontar
    return () => {
      if (updateIntervalRef.current !== null) {
        clearInterval(updateIntervalRef.current)
        updateIntervalRef.current = null
      }
    }
  }, [actualizarDatosMeteorologicos])

  // Función para abrir la configuración de la aplicación
  const abrirConfiguracion = () => {
    if (Platform.OS === "ios") {
      Linking.openURL("app-settings:")
    } else {
      Linking.openSettings()
    }
  }

  // Componente de escena AR que muestra los datos meteorológicos
  // Definido dentro del componente principal para tener acceso a los estados y props
  const ARMeteoScene = () => {
    // Estado para controlar la animación y visibilidad del panel
    const [panelVisible, setPanelVisible] = useState<boolean>(true)
    const [posicionAnclada, setPosicionAnclada] = useState<boolean>(false)

    // Referencia para evitar múltiples actualizaciones
    const actualizandoDatos = useRef<boolean>(false)

    // Función para manejar el anclaje del panel
    const anclarPanel = () => {
      setPosicionAnclada(true)
      // Feedback háptico al anclar
      ReactNativeHapticFeedback.trigger("notificationSuccess", hapticOptions)
      Alert.alert("Posición Anclada", "El panel se mostrará en esta posición.")
    }

    // Función para actualizar los datos
    const solicitarActualizacion = () => {
      if (!actualizandoDatos.current) {
        actualizandoDatos.current = true
        actualizarDatosMeteorologicos()
        // Feedback háptico al actualizar
        ReactNativeHapticFeedback.trigger("impactMedium", hapticOptions)
        setTimeout(() => {
          actualizandoDatos.current = false
        }, 300)
      }
    }

    // Registrar cuando la escena AR está lista
    const onInitialized = (state: any, reason: any) => {
      // En la versión actual de ViroReact, los estados de tracking son:
      // TRACKING_STATE_NORMAL, TRACKING_STATE_LIMITED y TRACKING_STATE_UNAVAILABLE
      if (state === "TRACKING_NORMAL") {
        console.log("AR Tracking inicializado correctamente")
      } else if (state === "TRACKING_UNAVAILABLE") {
        console.log("AR Tracking no disponible:", reason)
      } else if (state === "TRACKING_LIMITED") {
        console.log("AR Tracking limitado:", reason)
      }
    }

    // Definir animaciones para el panel
    useEffect(() => {
      ViroAnimations.registerAnimations({
        entradaPanel: {
          properties: {
            scaleX: 1.0,
            scaleY: 1.0,
            scaleZ: 1.0,
            opacity: 1.0,
          },
          duration: 500,
          easing: "bounce",
        },
        salidaPanel: {
          properties: {
            scaleX: 0.1,
            scaleY: 0.1,
            scaleZ: 0.1,
            opacity: 0.0,
          },
          duration: 300,
        },
      })
    }, [])

    return (
      <ViroARScene onTrackingUpdated={onInitialized}>
        {/* Panel principal con datos meteorológicos */}
        <ViroNode
          position={[0, 0, -2]} // Posición frente al usuario
          dragType={posicionAnclada ? "FixedToWorld" : "FixedDistance"}
          onDrag={() => {}}
          animation={{
            name: panelVisible ? "entradaPanel" : "salidaPanel",
            run: true,
            loop: false,
          }}
        >
          <ViroFlexView style={arStyles.panel} width={2.5} height={1.8} materials={["panelMaterial"]}>
            {/* Título con ubicación */}
            <ViroText
              text={datosMeteo.nombreUbicacion}
              style={arStyles.textoTitulo}
              width={2.0}
              height={0.3}
            />

            {/* Condición climática */}
            <ViroFlexView style={arStyles.condicionContainer}>
              <ViroText
                text={obtenerEmojiClima(datosMeteo.condicion)}
                style={arStyles.textoEmoji}
                width={0.5}
                height={0.5}
              />
              <ViroText
                text={datosMeteo.condicion}
                style={arStyles.textoCondicion}
                width={1.5}
                height={0.3}
              />
            </ViroFlexView>

            {/* Temperatura */}
            <ViroFlexView style={arStyles.filaInfo}>
              <ViroFlexView style={arStyles.panelInfo} materials={["infoPanelMaterial"]}>
                <ViroText
                  text="Temperatura"
                  style={arStyles.textoInfoTitulo}
                  width={1.0}
                  height={0.2}
                />
                <ViroText
                  text={`${datosMeteo.temperatura}°C`}
                  style={arStyles.textoTemperatura}
                  width={1.0}
                  height={0.3}
                />
                <ViroText
                  text={`Sensación: ${datosMeteo.sensacionTermica}°C`}
                  style={arStyles.textoInfoDetalle}
                  width={1.0}
                  height={0.2}
                />
              </ViroFlexView>

              {/* Humedad */}
              <ViroFlexView style={arStyles.panelInfo} materials={["infoPanelMaterial"]}>
                <ViroText
                  text="Humedad"
                  style={arStyles.textoInfoTitulo}
                  width={1.0}
                  height={0.2}
                />
                <ViroText
                  text={`${datosMeteo.humedad}%`}
                  style={arStyles.textoHumedad}
                  width={1.0}
                  height={0.3}
                />
              </ViroFlexView>
            </ViroFlexView>

            {/* Viento */}
            <ViroFlexView style={arStyles.panelViento} materials={["infoPanelMaterial"]}>
              <ViroText
                text="Viento"
                style={arStyles.textoInfoTitulo}
                width={2.0}
                height={0.2}
              />
              <ViroText
                text={`${datosMeteo.viento} km/h - Dir: ${datosMeteo.direccionViento}°`}
                style={arStyles.textoInfoDetalle}
                width={2.0}
                height={0.2}
              />
            </ViroFlexView>

            {/* Coordenadas y actualización */}
            <ViroText
              text={`Lat: ${ubicacion.coords.latitude.toFixed(4)}, Lon: ${ubicacion.coords.longitude.toFixed(4)}`}
              style={arStyles.textoCoordenadas}
              width={2.0}
              height={0.2}
            />
            <ViroText
              text={`Última actualización: ${new Date().toLocaleTimeString()}`}
              style={arStyles.textoActualizacion}
              width={2.0}
              height={0.2}
            />
          </ViroFlexView>
        </ViroNode>

        {/* Botones flotantes en AR */}
        <ViroNode position={[0, -1, -2]} dragType="FixedToWorld" onDrag={() => {}}>
          <ViroFlexView style={arStyles.botonesContainer} width={2.5} height={0.4} materials={["transparentMaterial"]}>
            {/* Botón para anclar */}
            <ViroFlexView
              style={arStyles.boton}
              width={0.7}
              height={0.3}
              materials={["anchorButtonMaterial"]}
              onClick={anclarPanel}
            >
              <ViroText
                text="Anclar Aquí"
                style={arStyles.textoBoton}
                width={0.6}
                height={0.2}
              />
            </ViroFlexView>

            {/* Botón para actualizar */}
            <ViroFlexView
              style={arStyles.boton}
              width={0.7}
              height={0.3}
              materials={["updateButtonMaterial"]}
              onClick={solicitarActualizacion}
            >
              <ViroText
                text="Actualizar"
                style={arStyles.textoBoton}
                width={0.6}
                height={0.2}
              />
            </ViroFlexView>
          </ViroFlexView>
        </ViroNode>
      </ViroARScene>
    )
  }

  // Renderizar contenido basado en el estado de los permisos
  if (tienePermisoCamara === null) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>Verificando permisos de cámara...</Text>
      </View>
    )
  }

  if (tienePermisoCamara === false) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>No se ha concedido acceso a la cámara</Text>
        <Text style={styles.permissionSubText}>
          Esta función necesita acceso a la cámara para mostrar la visualización AR
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={abrirConfiguracion}>
          <Text style={styles.permissionButtonText}>Abrir configuración</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.permissionButton, styles.secondaryButton]} onPress={() => navigation.goBack()}>
          <Text style={styles.secondaryButtonText}>Volver atrás</Text>
        </TouchableOpacity>
      </View>
    )
  }

  // Si tenemos permisos, mostrar la vista AR
  return (
    <View style={styles.container}>
      <ViroARSceneNavigator
        initialScene={{
          scene: ARMeteoScene,
        }}
        viroAppProps={{
          materials: arMaterials,
        }}
        style={styles.arView}
      />

      {/* Indicador de carga */}
      {cargando && (
        <View style={styles.loadingContainer}>
          <BlurView style={styles.loadingBlur} blurType="dark">
            <Text style={styles.loadingText}>Actualizando datos...</Text>
          </BlurView>
        </View>
      )}

      {/* Botón para volver */}
      <TouchableOpacity
        style={styles.botonVolver}
        onPress={() => {
          ReactNativeHapticFeedback.trigger("impactLight", hapticOptions)
          navigation.goBack()
        }}
      >
        <BlurView style={styles.buttonBlur} blurType="dark">
          <Text style={styles.botonTexto}>Volver</Text>
        </BlurView>
      </TouchableOpacity>
    </View>
  )
}

// Función para obtener emoji según condición climática
const obtenerEmojiClima = (condicion: string): string => {
  const condicionLower = condicion.toLowerCase()
  if (condicionLower.includes("lluvia") || condicionLower.includes("rain")) return "🌧️"
  if (condicionLower.includes("nube") || condicionLower.includes("cloud")) return "☁️"
  if (condicionLower.includes("sol") || condicionLower.includes("clear")) return "☀️"
  if (condicionLower.includes("nieve") || condicionLower.includes("snow")) return "❄️"
  if (condicionLower.includes("tormenta") || condicionLower.includes("thunder")) return "⛈️"
  if (condicionLower.includes("niebla") || condicionLower.includes("fog")) return "🌫️"
  return "🌤️" // Valor por defecto
}

const { width, height } = Dimensions.get("window")

// Estilos para la interfaz de usuario
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  arView: {
    flex: 1,
  },
  loadingContainer: {
    position: "absolute",
    top: 20,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  loadingBlur: {
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 0.5,
    borderColor: "rgba(255, 255, 255, 0.2)",
    padding: 10,
  },
  loadingText: {
    color: "#FFFFFF",
  },
  botonVolver: {
    position: "absolute",
    bottom: 30,
    left: 30,
    borderRadius: 30,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.5)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  buttonBlur: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  botonTexto: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    padding: 20,
  },
  permissionText: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  permissionSubText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 30,
    textAlign: "center",
  },
  permissionButton: {
    backgroundColor: "#0066CC",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 10,
    width: 200,
    alignItems: "center",
  },
  permissionButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#0066CC",
  },
  secondaryButtonText: {
    color: "#0066CC",
    fontWeight: "bold",
    fontSize: 16,
  },
})

// Estilos para los elementos AR
const arStyles = StyleSheet.create({
  panel: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 0.1,
  },
  textoTitulo: {
    fontSize: 30,
    color: "#FFFFFF",
    textAlignVertical: "center",
    fontWeight: "bold",
  },
  condicionContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  textoEmoji: {
    fontSize: 40,
    color: "#FFFFFF",
    textAlignVertical: "center",
  },
  textoCondicion: {
    fontSize: 24,
    color: "#FFFFFF",
    textAlignVertical: "center",
    fontWeight: "bold",
  },
  filaInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  panelInfo: {
    borderRadius: 0.1,
    padding: 0.05,
    margin: 0.05,
    alignItems: "center",
    justifyContent: "center",
  },
  textoInfoTitulo: {
    fontSize: 18,
    color: "#FFFFFF",
    textAlignVertical: "center",
  },
  textoTemperatura: {
    fontSize: 30,
    color: "#FF5733",
    textAlignVertical: "center",
    fontWeight: "bold",
  },
  textoHumedad: {
    fontSize: 30,
    color: "#33A1FF",
    textAlignVertical: "center",
    fontWeight: "bold",
  },
  textoInfoDetalle: {
    fontSize: 16,
    color: "#FFFFFF",
    textAlignVertical: "center",
  },
  panelViento: {
    borderRadius: 0.1,
    padding: 0.05,
    margin: 0.05,
    width: 2.0,
    alignItems: "center",
    justifyContent: "center",
  },
  textoCoordenadas: {
    fontSize: 14,
    color: "#FFFFFF",
    textAlignVertical: "center",
  },
  textoActualizacion: {
    fontSize: 12,
    color: "#FFFFFF",
    textAlignVertical: "center",
  },
  botonesContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  boton: {
    alignItems: "center",
    justifyContent: "center",
  },
  textoBoton: {
    fontSize: 16,
    color: "#FFFFFF",
    textAlignVertical: "center",
    fontWeight: "bold",
  },
})

export default ARScreen
