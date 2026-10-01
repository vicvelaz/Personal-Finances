import { buildCategoryTree, CATEGORY_KIND_LABELS, CATEGORY_KINDS, type CategoryRow } from '@fin/shared';
import { Link, router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, FormAlert } from '@/components/form';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useCategories } from '@/lib/categories';

export default function CategoriesScreen() {
  const categories = useCategories();
  const tree = buildCategoryTree(categories.data ?? []);

  return (
    <Screen titleKey="common.categories">
      <Button title="Nueva categoría" onPress={() => router.push('/profile/categories/new')} />
      {categories.isError && <FormAlert error="No se pudieron cargar las categorías" />}
      {CATEGORY_KINDS.map((kind) => (
        <View key={kind} style={styles.group}>
          <ThemedText type="smallBold">{CATEGORY_KIND_LABELS[kind]}</ThemedText>
          {tree[kind].map((c) => (
            <View key={c.id} style={styles.group}>
              <CategoryItem category={c} />
              {c.children.map((child) => (
                <View key={child.id} style={styles.child}>
                  <CategoryItem category={child} />
                </View>
              ))}
            </View>
          ))}
        </View>
      ))}
      <Button variant="link" title="Volver" onPress={() => router.back()} />
    </Screen>
  );
}

function CategoryItem({ category }: { category: CategoryRow }) {
  return (
    <Link href={{ pathname: '/profile/categories/[id]', params: { id: category.id } }} asChild>
      <Pressable accessibilityRole="link">
        <ThemedView type="backgroundElement" style={styles.row}>
          <View style={[styles.dot, { backgroundColor: category.color ?? '#94a3b8' }]} />
          <ThemedText translateText={false}>{category.name}</ThemedText>
        </ThemedView>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  group: { gap: Spacing.one },
  child: { paddingLeft: Spacing.four },
  row: {
    borderRadius: Spacing.two,
    padding: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  dot: { width: 12, height: 12, borderRadius: 6 },
});
