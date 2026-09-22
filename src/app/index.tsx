import { useAuthStore } from "@/stores/auth.store";
import { useRouter } from "expo-router";
import {
    FlatList,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const foodItems = [
  {
    id: "1",
    name: "Nasi Box Ayam Bakar",
    price: 24000,
    oldPrice: 36000,
    tag: "Promo",
    time: "15-20 min",
    image:
      "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "2",
    name: "Ramen Pedas Tokyo",
    price: 31000,
    oldPrice: 47000,
    tag: "Hot",
    time: "20 min",
    image:
      "https://images.unsplash.com/photo-1557872943-16a5ac26437e?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "3",
    name: "Salad Bowl Segar",
    price: 22000,
    oldPrice: 32000,
    tag: "Fresh",
    time: "10 min",
    image:
      "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "4",
    name: "Pasta Carbonara",
    price: 29000,
    oldPrice: 42000,
    tag: "Best Seller",
    time: "18 min",
    image:
      "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&w=900&q=80",
  },
];

export default function MarketplaceLandingScreen() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const handleContinue = () => {
    if (isAuthenticated) {
      router.push("/(customer)");
      return;
    }

    router.push("/(auth)/login");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.brand}>safo</Text>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() =>
              router.push(isAuthenticated ? "/(customer)" : "/(auth)/login")
            }
          >
            <Text style={styles.headerButtonText}>
              {isAuthenticated ? "Dashboard" : "Login"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.heroSection}>
          <Text style={styles.eyebrow}>Makanan enak, harga ramah</Text>
          <Text style={styles.heroTitle}>
            Belanja makanan favoritmu di sini
          </Text>
          <Text style={styles.heroSubtitle}>
            Pilih menu favorit dari partner kuliner terdekat. Hemat, cepat, dan
            siap diantar ke lokasi Anda.
          </Text>

          <View style={styles.heroActions}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleContinue}
            >
              <Text style={styles.primaryButtonText}>Mulai Pesan</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.push("/(auth)/register")}
            >
              <Text style={styles.secondaryButtonText}>Daftar Sekarang</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Menu hari ini</Text>
          <Text style={styles.sectionLink}>Lihat semua</Text>
        </View>

        <FlatList
          data={foodItems}
          renderItem={({ item }) => (
            <View key={item.id} style={styles.card}>
              <Image source={{ uri: item.image }} style={styles.cardImage} />
              <View style={styles.cardContent}>
                <View style={styles.cardTopRow}>
                  <Text style={styles.cardTag}>{item.tag}</Text>
                  <Text style={styles.cardTime}>{item.time}</Text>
                </View>

                <Text style={styles.cardName}>{item.name}</Text>

                <View style={styles.priceRow}>
                  <Text style={styles.price}>
                    Rp {item.price.toLocaleString("id-ID")}
                  </Text>
                  <Text style={styles.oldPrice}>
                    Rp {item.oldPrice.toLocaleString("id-ID")}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.cardButton}
                  onPress={() =>
                    router.push(
                      isAuthenticated ? "/(customer)" : "/(auth)/login",
                    )
                  }
                >
                  <Text style={styles.cardButtonText}>
                    {isAuthenticated ? "Pesan" : "Login untuk pesan"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          contentContainerStyle={styles.cardList}
        />

        <View style={styles.infoPanel}>
          <Text style={styles.infoTitle}>Kenapa pilih SAFO?</Text>
          <View style={styles.featureRow}>
            <Text style={styles.featureDot}>•</Text>
            <Text style={styles.featureText}>
              Menu surplus dengan harga lebih murah
            </Text>
          </View>
          <View style={styles.featureRow}>
            <Text style={styles.featureDot}>•</Text>
            <Text style={styles.featureText}>
              Pemesanan cepat dan tanpa ribet
            </Text>
          </View>
          <View style={styles.featureRow}>
            <Text style={styles.featureDot}>•</Text>
            <Text style={styles.featureText}>
              Mendukung gerakan mengurangi makanan terbuang
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f4f0eb",
  },
  container: {
    paddingHorizontal: 22,
    paddingBottom: 32,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 18,
    paddingBottom: 12,
  },
  brand: {
    fontSize: 40,
    fontWeight: "800",
    color: "#121212",
    letterSpacing: -2,
  },
  headerButton: {
    backgroundColor: "#1a5c52",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  headerButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14,
  },
  heroSection: {
    backgroundColor: "#e7e1d9",
    borderRadius: 28,
    padding: 20,
    marginTop: 8,
    marginBottom: 24,
  },
  eyebrow: {
    color: "#1a5c52",
    fontWeight: "700",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: "800",
    color: "#111111",
    lineHeight: 40,
    letterSpacing: -1.5,
  },
  heroSubtitle: {
    marginTop: 10,
    fontSize: 16,
    color: "#4a4a4a",
    lineHeight: 24,
  },
  heroActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
    flexWrap: "wrap",
  },
  primaryButton: {
    backgroundColor: "#1a5c52",
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 14,
    minWidth: 150,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 14,
    minWidth: 150,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d9d0c6",
  },
  secondaryButtonText: {
    color: "#1a1a1a",
    fontWeight: "700",
    fontSize: 16,
  },
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 30,
    fontWeight: "800",
    color: "#121212",
    letterSpacing: -1,
  },
  sectionLink: {
    color: "#1a5c52",
    fontWeight: "700",
    fontSize: 14,
  },
  cardList: {
    gap: 18,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e1d9cf",
    marginBottom: 18,
  },
  cardImage: {
    width: "100%",
    height: 190,
    resizeMode: "cover",
  },
  cardContent: {
    padding: 16,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardTag: {
    backgroundColor: "#dfeecb",
    color: "#1f4e3d",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: "700",
  },
  cardTime: {
    color: "#5d5d5d",
    fontWeight: "600",
    fontSize: 12,
  },
  cardName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111111",
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  price: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1a5c52",
  },
  oldPrice: {
    fontSize: 14,
    color: "#8d8d8d",
    textDecorationLine: "line-through",
  },
  cardButton: {
    backgroundColor: "#1a5c52",
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: "center",
  },
  cardButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 15,
  },
  infoPanel: {
    backgroundColor: "#edf4ef",
    borderRadius: 24,
    padding: 20,
    marginTop: 4,
  },
  infoTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#111111",
    marginBottom: 12,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  featureDot: {
    fontSize: 20,
    color: "#1a5c52",
    marginRight: 10,
    fontWeight: "800",
  },
  featureText: {
    flex: 1,
    color: "#2d2d2d",
    fontSize: 16,
    lineHeight: 24,
  },
});
