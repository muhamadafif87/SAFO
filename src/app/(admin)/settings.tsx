import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, FontSize, FontWeight } from '@/constants/typography';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function AdminSettingsScreen() {
  const router = useRouter();
  const [platformFee, setPlatformFee] = useState('1000');
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      Alert.alert('Sukses', 'Pengaturan berhasil disimpan');
    }, 1000);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Button title="< Kembali" variant="ghost" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Pengaturan Bisnis</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Komisi & Biaya</Text>
          <Text style={styles.sectionDesc}>Atur biaya platform yang dikenakan ke customer per transaksi.</Text>
          
          <Input 
            label="Platform Fee (Rp)"
            value={platformFee}
            onChangeText={setPlatformFee}
            keyboardType="numeric"
          />
        </View>
        
        <Button 
          title="Simpan Pengaturan" 
          onPress={handleSave} 
          isLoading={isLoading} 
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing[4],
    backgroundColor: Colors.neutral[0],
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  content: {
    padding: Spacing[4],
  },
  section: {
    backgroundColor: Colors.neutral[0],
    padding: Spacing[4],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    marginBottom: Spacing[6],
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing[1],
  },
  sectionDesc: {
    fontSize: FontSize.sm,
    color: Colors.neutral[600],
    marginBottom: Spacing[4],
  },
});
