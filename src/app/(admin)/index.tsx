import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/auth.store';
import { adminService, AdminDashboardStats } from '@/services/admin.service';
import { Button } from '@/components/ui/Button';
import { Colors, Spacing, FontSize, FontWeight } from '@/constants/typography';

export default function AdminHome() {
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  
  const [stats, setStats] = React.useState<AdminDashboardStats | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    adminService.getDashboardStats()
      .then(setStats)
      .catch(err => console.error('Failed to load dashboard stats:', err))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Admin Panel</Text>
        <Text style={styles.subtitle}>Welcome back, {user?.email}</Text>

        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Mitra Pending</Text>
            <Text style={styles.statValue}>
              {isLoading ? '...' : stats?.pendingMitra || 0}
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total Transaksi</Text>
            <Text style={styles.statValue}>
              {isLoading ? '...' : stats?.totalTransactions || 0}
            </Text>
          </View>
        </View>

        <View style={styles.navGrid}>
          <Button 
            title="Review Mitra Pending" 
            variant="secondary"
            onPress={() => router.push('/(admin)/mitra/pending')}
            style={styles.navButton}
          />
          <Button 
            title="Daftar Mitra" 
            variant="secondary"
            onPress={() => router.push('/(admin)/mitra')}
            style={styles.navButton}
          />
          <Button 
            title="Semua Transaksi" 
            variant="secondary"
            onPress={() => router.push('/(admin)/transactions')}
            style={styles.navButton}
          />
          <Button 
            title="Pengaturan & Komisi" 
            variant="secondary"
            onPress={() => router.push('/(admin)/settings')}
            style={styles.navButton}
          />
        </View>

        <Button
          title="Logout"
          variant="danger"
          onPress={() => clearAuth()}
          style={styles.logoutButton}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  content: {
    flex: 1,
    padding: Spacing[6],
  },
  title: {
    fontSize: FontSize['3xl'],
    fontWeight: FontWeight.bold,
    marginBottom: Spacing[2],
  },
  subtitle: {
    fontSize: FontSize.lg,
    color: Colors.neutral[600],
    marginBottom: Spacing[6],
  },
  statsContainer: {
    flexDirection: 'row',
    gap: Spacing[4],
    marginBottom: Spacing[8],
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.neutral[0],
    padding: Spacing[4],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  statLabel: {
    fontSize: FontSize.sm,
    color: Colors.neutral[500],
    marginBottom: Spacing[1],
  },
  statValue: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.bold,
    color: Colors.primary[600],
  },
  navGrid: {
    gap: Spacing[3],
    marginBottom: Spacing[8],
  },
  navButton: {
    justifyContent: 'flex-start',
    paddingHorizontal: Spacing[4],
  },
  logoutButton: {
    marginTop: 'auto',
    alignSelf: 'flex-start',
  },
});
