import React, { useState } from 'react';
import { View, Text, Button, TextInput, Alert, StyleSheet, ScrollView } from 'react-native';
import { BannerAd, BannerAdSize, TestIds, InterstitialAd, AdEventType, RewardedAd, RewardedAdEventType } from 'react-native-google-mobile-ads';
import axios from 'axios';

// ============ 🔑 CAMBIA ESTO CON TUS CLAVES REALES ============
const CONFIG = {
  OPENAI_KEY: "TU_OPENAI_KEY_AQUI",
  ADMOB_BANNER: TestIds.BANNER,
  ADMOB_INTERSTICIAL: TestIds.INTERSTITIAL,
  ADMOB_REWARDED: TestIds.REWARDED,
  PAYPAL_EMAIL: "joanlazaro83@gmail.com",
  BACKEND_URL: "https://tu-backend.railway.app", // Lo cambias cuando subas el backend
};

// Intersticial (cada 3 acciones)
const interstitial = InterstitialAd.createForAdRequest(CONFIG.ADMOB_INTERSTICIAL);
let accionCount = 0;

// Recompensado
const rewarded = RewardedAd.createForAdRequest(CONFIG.ADMOB_REWARDED);

export default function App() {
  const [chat, setChat] = useState("");
  const [respuesta, setRespuesta] = useState("");
  const [saldo, setSaldo] = useState(2.50); // Saldo inicial demo
  const [loading, setLoading] = useState(false);

  // ============ AGENTE IA ============
  const hablarIA = async () => {
    if (!chat.trim()) return;
    setLoading(true);
    try {
      const res = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "Eres FINANRUS, un asistente financiero que ayuda a gestionar ingresos, retiros y suscripciones. Responde breve y útil." },
            { role: "user", content: chat }
          ]
        },
        { headers: { Authorization: `Bearer ${CONFIG.OPENAI_KEY}`, 'Content-Type': 'application/json' } }
      );
      setRespuesta(res.data.choices[0].message.content);
      contarAccion();
    } catch (e) {
      setRespuesta("Error al conectar con el agente. Revisa tu API Key.");
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
});