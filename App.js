import React, { useState } from 'react';
import { View, Text, Button, TextInput, Alert, StyleSheet, ScrollView, TouchableOpacity, Image, Linking } from 'react-native';
import { BannerAd, BannerAdSize, TestIds, InterstitialAd, AdEventType, RewardedAd, RewardedAdEventType } from 'react-native-google-mobile-ads';
import axios from 'axios';

import SECRET_CONFIG from './config';

// ============ 🔑 CONFIG ============
const CONFIG = {
  // 🔗 Backend propio en Render (gratis)
  BACKEND_URL: "https://finanrus-backend.onrender.com",

  // 🆓 OpenRouter fallback directo (por si el backend duerme)
  OPENAI_KEY: SECRET_CONFIG.OPENAI_KEY || "sk-or-v1-TU_KEY",
  OPENAI_URL: "https://openrouter.ai/api/v1",
  MODELO: "nvidia/nemotron-3-ultra-550b-a55b:free",

  // 🆓 Gemini fallback
  GEMINI_KEY: SECRET_CONFIG.GEMINI_KEY || "AIzaSyTU_KEY",
  GEMINI_URL: "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",

  // ANUNCIOS
  ADMOB_BANNER: "ca-app-pub-3940256099942544/6300978111",
  ADMOB_INTERSTICIAL: "ca-app-pub-3940256099942544/1033173712",
  ADMOB_REWARDED: "ca-app-pub-3940256099942544/5224354917",

  PAYPAL_EMAIL: "joanlazaro83@gmail.com",
  PAYPAL_CLIENT_ID: SECRET_CONFIG.PAYPAL_CLIENT_ID || "BAAMzxgBPbp7RG7SlZEOoz1-Wku9akVCrEH6kcwGLhKqpC-VHtcc_IRYBtJF4znmTg80iJIwWul7WDCp4o",
  AMAZON_TAG: "r3dm01-21",
};

// ============ 📚 AFILIADOS AMAZON ============
const AFILIADOS = [
  { asin: "8423439062", titulo: "Hazlo bien con tus inversiones", precio: "20,85€", rating: 4.9, img: "https://m.media-amazon.com/images/I/51PsHygbU+L._AC_UL320_.jpg" },
  { asin: "8423440737", titulo: "Educación financiera para la vida real", precio: "20,85€", rating: 4.4, img: "https://m.media-amazon.com/images/I/610kr0uswPL._AC_UL320_.jpg" },
  { asin: "B08Q6M7Q3R", titulo: "Inversión: Claves para libertad financiera", precio: "18,71€", rating: 4.7, img: "https://m.media-amazon.com/images/I/61qAdpPwLYL._AC_UL320_.jpg" },
  { asin: "8423425401", titulo: "El pequeño libro para invertir (Bogle)", precio: "17,05€", rating: 4.5, img: "https://m.media-amazon.com/images/I/51EoCpvVA0L._AC_UL320_.jpg" },
  { asin: "1517011906", titulo: "Independízate de Papá Estado", precio: "13,99€", rating: 4.5, img: "https://m.media-amazon.com/images/I/613AORfuL5L._AC_UL320_.jpg" },
  { asin: "B0G6FP4YBR", titulo: "Trading Online: 12 libros en 1", precio: "16,96€", rating: 4.7, img: "https://m.media-amazon.com/images/I/71rPgj1TziL._AC_UL320_.jpg" },
  { asin: "1720259321", titulo: "Wyckoff en profundidad (Trading)", precio: "20,79€", rating: 4.6, img: "https://m.media-amazon.com/images/I/61syT068V8L._AC_UL320_.jpg" },
];

const amazonUrl = (asin) => `https://www.amazon.es/dp/${asin}?tag=${CONFIG.AMAZON_TAG}`;

// Intersticial (cada 3 acciones)
const interstitial = InterstitialAd.createForAdRequest(CONFIG.ADMOB_INTERSTICIAL);
let accionCount = 0;

// Recompensado
const rewarded = RewardedAd.createForAdRequest(CONFIG.ADMOB_REWARDED);

export default function App() {
  const [chat, setChat] = useState("");
  const [respuesta, setRespuesta] = useState("");
  const [saldo, setSaldo] = useState(2.50);
  const [loading, setLoading] = useState(false);

  // ============ AGENTE IA ============
  const hablarIA = async () => {
    if (!chat.trim()) return;
    setLoading(true);
    try {
      // 🔄 INTENTO #1: Backend propio en Render (GitHub Models → OpenRouter → Gemini)
      try {
        const res = await axios.post(
          `${CONFIG.BACKEND_URL}/api/chat`,
          { message: chat },
          { headers: { 'Content-Type': 'application/json' }, timeout: 20000 }
        );
        setRespuesta(res.data.reply || res.data.message || "Sin respuesta del backend.");
      } catch (e1) {
        // 🔄 FALLBACK #2: OpenRouter directo
        try {
          const res2 = await axios.post(
            `${CONFIG.OPENAI_URL}/chat/completions`,
            {
              model: CONFIG.MODELO,
              messages: [
                { role: "system", content: "Eres FINANRUS, un asistente financiero que ayuda a gestionar ingresos, retiros y suscripciones. Responde breve y útil." },
                { role: "user", content: chat }
              ]
            },
            { headers: { Authorization: `Bearer ${CONFIG.OPENAI_KEY}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://finanrus.app', 'X-Title': 'FINANRUS' } }
          );
          setRespuesta(res2.data.choices[0].message.content);
        } catch (e2) {
          // 🔄 FALLBACK #3: Gemini
          try {
            const res3 = await axios.post(
              `${CONFIG.GEMINI_URL}?key=${CONFIG.GEMINI_KEY}`,
              { contents: [{ parts: [{ text: `Eres FINANRUS, un asistente financiero. Responde breve y útil. ${chat}` }] }] }
            );
            const texto = res3.data?.candidates?.[0]?.content?.parts?.[0]?.text || "Lo siento, no pude procesar eso.";
            setRespuesta(texto);
          } catch (e3) {
            setRespuesta("❌ Servicio temporalmente no disponible. Inténtalo en unos minutos.");
          }
        }
      }
      contarAccion();
    } catch (err) {
      setRespuesta("❌ Error inesperado. Inténtalo de nuevo.");
    }
    setLoading(false);
  };

  // ============ PAYPAL - PAGAR SUSCRIPCIÓN ============
  const pagarSuscripcion = () => {
    Alert.alert(
      "PayPal Checkout",
      `Suscripción premium: 4.99€/mes\n\nSe abrirá PayPal para procesar el pago a:\n${CONFIG.PAYPAL_EMAIL}`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Pagar 4.99€", onPress: () => {
          Alert.alert("✅ Pago realizado", "Suscripción premium activa. ¡Disfruta sin anuncios y agente IA ilimitado!");
          contarAccion();
        }}
      ]
    );
  };

  // ============ RETIRAR A PAYPAL ============
  const retirar = () => {
    if (saldo < 10) {
      Alert.alert("Saldo insuficiente", `Necesitas mínimo 10€. Tu saldo: ${saldo.toFixed(2)}€\n\n💡 Gana saldo viendo anuncios o con suscripciones.`);
      return;
    }
    Alert.alert(
      "Solicitar Retiro",
      `Vas a retirar ${saldo.toFixed(2)}€ a:\n${CONFIG.PAYPAL_EMAIL}\n\nEl agente IA revisará y aprobará la solicitud.`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Solicitar", onPress: () => {
          setSaldo(0);
          Alert.alert("✅ Retiro solicitado", `Se enviarán ${saldo.toFixed(2)}€ a ${CONFIG.PAYPAL_EMAIL}\n\nEl agente FINANRUS lo procesará en breve.`);
          contarAccion();
        }}
      ]
    );
  };

  // ============ ANUNCIO RECOMPENSADO ============
  const verAnuncio = () => {
    rewarded.load();
    rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
      rewarded.show();
    });
    rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, (reward) => {
      const ganancia = 1.00;
      setSaldo(prev => prev + ganancia);
      Alert.alert("🎉 +1€", `Has ganado ${ganancia.toFixed(2)}€ viendo el anuncio. Saldo actual: ${(saldo + ganancia).toFixed(2)}€`);
    });
    Alert.alert("📺 Anuncio", "Cargando anuncio recompensado...");
    contarAccion();
  };

  // ============ CONTADOR PARA INTERSTICIAL ============
  const contarAccion = () => {
    accionCount++;
    if (accionCount % 3 === 0) {
      interstitial.load();
      interstitial.addAdEventListener(AdEventType.LOADED, () => {
        interstitial.show();
      });
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* HEADER */}
      <Text style={styles.title}>💰 FINANRUS</Text>
      <Text style={styles.subtitle}>Tu agente financiero inteligente</Text>

      {/* SALDO */}
      <View style={styles.saldoBox}>
        <Text style={styles.saldoLabel}>Saldo disponible</Text>
        <Text style={styles.saldoAmount}>{saldo.toFixed(2)}€</Text>
        <Text style={styles.saldoMin}>Mínimo retiro: 10€</Text>
      </View>

      {/* CHAT CON IA */}
      <Text style={styles.sectionTitle}>🤖 Agente IA</Text>
      <TextInput
        style={styles.input}
        placeholder="Ej: ¿Cuánto saldo tengo?"
        value={chat}
        onChangeText={setChat}
        placeholderTextColor="#555"
      />
      <Button title={loading ? "Pensando..." : "Enviar a FINANRUS"} onPress={hablarIA} disabled={loading} />
      {respuesta ? (
        <View style={styles.respuestaBox}>
          <Text style={styles.respuestaText}>{respuesta}</Text>
        </View>
      ) : null}

      {/* ACCIONES */}
      <Text style={styles.sectionTitle}>⚡ Acciones</Text>
      <View style={styles.buttonSpacing}>
        <Button title="💳 Pagar Suscripción 4.99€" onPress={pagarSuscripcion} color="#0070BA" />
      </View>
      <View style={styles.buttonSpacing}>
        <Button title="💸 Retirar a PayPal" onPress={retirar} color="#2C2C2C" />
      </View>
      <View style={styles.buttonSpacing}>
        <Button title="📺 Ver Anuncio +1€" onPress={verAnuncio} color="#4CAF50" />
      </View>

      {/* INFO */}
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          🔹 Cada 3 acciones verás un anuncio (ayuda a mantener la app gratuita){'\n'}
          🔹 Ver anuncio recompensado = +1€ a tu saldo{'\n'}
          🔹 Retiro mínimo: 10€ vía PayPal{'\n'}
          🔹 Suscripción 4.99€: sin anuncios + agente IA ilimitado
        </Text>
      </View>

      {/* 📚 RECOMENDACIONES AFILIADAS */}
      <Text style={styles.sectionTitle}>📚 Recomendado para ti</Text>
      <Text style={{ color: '#666', fontSize: 11, marginBottom: 10 }}>
        Libros que te ayudarán a dominar tus finanzas (comprar en Amazon ayuda a mantener la app gratis)
      </Text>
      {AFILIADOS.map((libro, i) => (
        <TouchableOpacity key={i} style={styles.afiliadoCard} onPress={() => {
          Linking.openURL(amazonUrl(libro.asin)).catch(() =>
            Alert.alert("Abrir enlace", amazonUrl(libro.asin))
          );
        }}>
          <Image
            source={{ uri: libro.img }}
            style={styles.afiliadoImg}
            defaultSource={{ uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=' }}
          />
          <View style={styles.afiliadoInfo}>
            <Text style={styles.afiliadoTitulo}>{libro.titulo}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.afiliadoPrecio}>{libro.precio}</Text>
              <Text style={styles.afiliadoRating}>⭐ {libro.rating}</Text>
            </View>
            <Text style={styles.afiliadoLink}>Ver en Amazon →</Text>
          </View>
        </TouchableOpacity>
      ))}

      {/* BANNER ADMOB */}
      <View style={styles.bannerContainer}>
        <BannerAd
          unitId={CONFIG.ADMOB_BANNER}
          size={BannerAdSize.BANNER}
        />
      </View>

      <Text style={{ textAlign: 'center', color: '#999', marginTop: 20, marginBottom: 30 }}>
        FINANRUS v1.0 — © 2026
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#0D1117' },
  title: { fontSize: 32, fontWeight: 'bold', textAlign: 'center', marginTop: 40, color: '#00D4AA' },
  subtitle: { textAlign: 'center', color: '#888', marginBottom: 20, fontSize: 14 },
  saldoBox: { backgroundColor: '#1A1F2E', borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#00D4AA33' },
  saldoLabel: { color: '#888', fontSize: 14 },
  saldoAmount: { fontSize: 48, fontWeight: 'bold', color: '#00D4AA', marginVertical: 5 },
  saldoMin: { color: '#666', fontSize: 12 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFF', marginTop: 15, marginBottom: 10 },
  input: { backgroundColor: '#1A1F2E', color: '#FFF', borderRadius: 10, padding: 12, marginBottom: 10, fontSize: 16, borderWidth: 1, borderColor: '#333' },
  respuestaBox: { backgroundColor: '#1A1F2E', borderRadius: 10, padding: 15, marginTop: 10, borderLeftWidth: 3, borderLeftColor: '#00D4AA' },
  respuestaText: { color: '#DDD', fontSize: 14, lineHeight: 20 },
  buttonSpacing: { marginTop: 8 },
  infoBox: { backgroundColor: '#1A1F2E', borderRadius: 10, padding: 15, marginTop: 20, borderWidth: 1, borderColor: '#333' },
  infoText: { color: '#AAA', fontSize: 12, lineHeight: 18 },
  bannerContainer: { alignItems: 'center', marginTop: 20 },
  afiliadoCard: { flexDirection: 'row', backgroundColor: '#1A1F2E', borderRadius: 12, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: '#333', alignItems: 'center' },
  afiliadoImg: { width: 50, height: 70, borderRadius: 6, backgroundColor: '#222' },
  afiliadoInfo: { flex: 1, marginLeft: 12 },
  afiliadoTitulo: { color: '#FFF', fontSize: 13, fontWeight: 'bold', marginBottom: 4 },
  afiliadoPrecio: { color: '#00D4AA', fontSize: 14, fontWeight: 'bold' },
  afiliadoRating: { color: '#FFD700', fontSize: 12 },
  afiliadoLink: { color: '#0070BA', fontSize: 11, marginTop: 4 },
});
