import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { CategoryGridAmazon } from '@/components/category-designs/CategoryGridAmazon';
import { CategoryHeroCards } from '@/components/category-designs/CategoryHeroCards';
import { CategoryListRows } from '@/components/category-designs/CategoryListRows';
import { CategoryWrappedChips } from '@/components/category-designs/CategoryWrappedChips';
import { DesignPreviewShell } from '@/components/category-designs/DesignPreviewShell';
import { getCategoryLabel } from '@/constants/categoryMeta';
import { useProducts } from '@/context/ProductsContext';
import { usePaginatedProducts } from '@/hooks/usePaginatedProducts';
import { ProductCategory } from '@/types';

function MiniProductPreview({
  category,
  label,
}: {
  category: ProductCategory | 'all' | null;
  label: string;
}) {
  const { categoryCounts } = useProducts();
  const { products: preview } = usePaginatedProducts({
    categoryId: category && category !== 'all' ? category : null,
    enabled: Boolean(category),
    pageSize: 2,
  });

  if (!category) {
    return (
      <Text className="text-center text-xs text-muted">
        Tap a category above to preview filtered products
      </Text>
    );
  }

  const total =
    category === 'all'
      ? Object.values(categoryCounts).reduce((sum, count) => sum + count, 0)
      : categoryCounts[category] ?? preview.length;

  return (
    <View>
      <Text className="mb-2 text-xs font-semibold text-muted">
        Showing {label} · {total > 0 ? total : preview.length}+ items
      </Text>
      {preview.map((product) => (
        <View
          key={product.id}
          className="mb-2 flex-row items-center rounded-xl border border-border bg-surface px-3 py-2"
        >
          <Text className="mr-3 text-2xl">{product.emoji}</Text>
          <View className="flex-1">
            <Text className="text-sm font-semibold text-foreground">{product.name}</Text>
            <Text className="text-xs text-primary">₹{product.price}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

export default function CategoryDesignsScreen() {
  const { categoryCounts } = useProducts();

  const counts = categoryCounts as Partial<Record<ProductCategory, number>>;

  const [gridPick, setGridPick] = useState<ProductCategory | null>(null);
  const [heroPick, setHeroPick] = useState<ProductCategory | 'all'>('all');
  const [listPick, setListPick] = useState<ProductCategory | null>(null);
  const [chipPick, setChipPick] = useState<ProductCategory | 'all' | null>('all');

  const pickLabel = (category: ProductCategory | 'all' | null) => {
    if (!category) return '';
    if (category === 'all') return 'All items';
    return getCategoryLabel(category);
  };

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4 pb-10">
      <Text className="mb-1 text-2xl font-bold text-foreground">Category layouts</Text>
      <Text className="mb-6 text-sm text-muted">
        Compare Amazon-style mid-screen sections vs the current horizontal scroll bar. Tap each
        preview to see how selection feels.
      </Text>

      <DesignPreviewShell
        title="Option A — Icon grid"
        subtitle="Amazon / Blinkit style. Categories as a 3×2 grid below search — no sideways scroll."
        badge="Recommended"
        footer={
          <MiniProductPreview category={gridPick} label={pickLabel(gridPick)} />
        }
      >
        <CategoryGridAmazon selected={gridPick} onSelect={setGridPick} counts={counts} />
      </DesignPreviewShell>

      <DesignPreviewShell
        title="Option B — Hero cards"
        subtitle="Bigger 2-column cards with color blocks. More visual, fewer taps per row."
        badge="Bold"
        footer={
          <MiniProductPreview category={heroPick} label={pickLabel(heroPick)} />
        }
      >
        <CategoryHeroCards
          onCategoryPress={(category) => setHeroPick(category)}
        />
      </DesignPreviewShell>

      <DesignPreviewShell
        title="Option C — Department list"
        subtitle="Stacked rows with chevron, like Amazon “Shop by department”. Scannable on one screen."
        badge="Clean"
        footer={
          <MiniProductPreview category={listPick} label={pickLabel(listPick)} />
        }
      >
        <CategoryListRows selected={listPick} onSelect={setListPick} counts={counts} />
      </DesignPreviewShell>

      <DesignPreviewShell
        title="Option D — Wrapped chips"
        subtitle="Keeps pill filters but moves them into the scroll body — wraps to multiple lines."
        badge="Minimal change"
        footer={
          <MiniProductPreview category={chipPick} label={pickLabel(chipPick)} />
        }
      >
        <CategoryWrappedChips selected={chipPick} onSelect={setChipPick} />
      </DesignPreviewShell>

      <View className="rounded-2xl border border-dashed border-border bg-surface p-4">
        <Text className="mb-2 text-sm font-bold text-foreground">Current (horizontal bar)</Text>
        <Text className="text-xs leading-5 text-muted">
          Pills in a fixed strip under the header. Works for quick filter, but hides categories off
          screen and feels less like a “shop home”.
        </Text>
      </View>
    </ScrollView>
  );
}
