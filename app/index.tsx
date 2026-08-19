import { StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.screen}>
      <View style={styles.window}>
        <View style={styles.titleBar}>
          <Text accessibilityRole="header" style={styles.title}>
            Inside Me
          </Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.heading}>나의 마음을 천천히 살펴봐요.</Text>
          <Text style={styles.body}>글 기록과 감정·욕구 탐색을 위한 기반을 준비했어요.</Text>

          <View accessibilityLabel="Expo 기반 준비 완료" style={styles.statusPanel}>
            <Text style={styles.statusText}>● Expo 기반 준비 완료</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: 'center',
    backgroundColor: '#d7d2c4',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  window: {
    backgroundColor: '#f4f0e6',
    borderColor: '#3f3d36',
    borderWidth: 2,
    maxWidth: 480,
    width: '100%',
  },
  titleBar: {
    backgroundColor: '#244a86',
    borderBottomColor: '#3f3d36',
    borderBottomWidth: 2,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  title: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  content: {
    gap: 14,
    padding: 22,
  },
  heading: {
    color: '#23221f',
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 30,
  },
  body: {
    color: '#46433c',
    fontSize: 16,
    lineHeight: 24,
  },
  statusPanel: {
    backgroundColor: '#ffffff',
    borderColor: '#8d887c',
    borderWidth: 1,
    marginTop: 4,
    padding: 12,
  },
  statusText: {
    color: '#245c39',
    fontSize: 15,
    fontWeight: '600',
  },
});
