import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  TextInput,
  StyleSheet,
} from 'react-native';
import { apiUrl } from 'apiurl';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProductVariant {
  id: number;
  size?: string;
  color?: string;
  rate?: number;
  mrp?: number;
  qty: number;
}

export interface Product {
  id: number;
  name: string;
  brand?: string;
  model?: string;
  price: number;
  color?: string;          // ← direct DB column
  stock: number;
  description?: string;
  dealerid: number;
  image?: string | null;
  attributes?: Record<string, string>;
  business_type_id?: number | null;
  variants?: ProductVariant[];
}

export interface CartItem {
  productId: number;
  variantId: number;
  size?: string;
  color?: string;
  price: number;
  quantity: number;
  stock: number;
}

interface ProductCartProps {
  product: Product;
  showSize?: boolean;
  cart: CartItem[];
  onAddVariant: (productId: number, variant: ProductVariant, qty: number) => void;
  onUpdateVariantQty: (productId: number, variantId: number, qty: number) => void;
  onRemoveVariant: (productId: number, variantId: number) => void;
  onAddSimple: (productId: number) => void;
  onUpdateSimpleQty: (productId: number, qty: number) => void;
  onRemoveSimple: (productId: number) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getImageUri = (img: string | null | undefined): string | null => {
  if (!img) return null;
  if (img.startsWith('http')) return img;
  return `${apiUrl}/${img}`;
};

// ✅ FIXED: direct product.color checked first (matches your DB column)
const resolveColor = (product: Product): string => {
  // 1. Direct DB column — product.color
  const direct = String(product.color ?? '').trim();
  if (direct && direct !== 'null' && direct !== 'undefined') return direct;

  // 2. attributes.color fallback
  const attrColor = String(product.attributes?.color ?? '').trim();
  if (attrColor && attrColor !== 'null' && attrColor !== 'undefined') return attrColor;

  return '';
};

const formatINR = (amount: number) =>
  '₹' + amount.toLocaleString('en-IN');

// ─── Component ────────────────────────────────────────────────────────────────

const ProductCart: React.FC<ProductCartProps> = ({
  product,
  showSize = false,
  cart,
  onAddVariant,
  onUpdateVariantQty,
  onRemoveVariant,
  onAddSimple,
  onUpdateSimpleQty,
  onRemoveSimple,
}) => {
  const [imgError, setImgError] = useState(false);
  const [pendingQty, setPendingQty] = useState<Record<number, string>>(() => {
    const init: Record<number, string> = {};
    (product.variants ?? []).forEach((v) => { init[v.id] = '1'; });
    return init;
  });

  const imageUri = getImageUri(product.image);
  const productColor = resolveColor(product);
  const hasVariants = (product.variants ?? []).length > 0;

  const getCartVariant = (variantId: number): CartItem | undefined =>
    cart.find((c) => c.productId === product.id && c.variantId === variantId);

  const getCartSimple = (): CartItem | undefined =>
    cart.find((c) => c.productId === product.id && c.variantId === 0);

  const totalInCart = cart
    .filter((c) => c.productId === product.id)
    .reduce((s, c) => s + c.quantity, 0);

  const SKIP_KEYS = new Set(['mrp', 'size', 'color', 'brand', 'model', 'design']);
  const attrPills = Object.entries(product.attributes ?? {})
    .filter(([k, v]) => v && !SKIP_KEYS.has(k))
    .slice(0, 2);

  const designNo: string =
    product.attributes?.design ||
    (() => {
      const m = product.name.match(/Design No[:\s]+(\S+)/i);
      return m ? m[1] : '';
    })();

  const handleAddVariant = (variant: ProductVariant) => {
    const raw = pendingQty[variant.id] ?? '1';
    const qty = parseInt(raw, 10);
    if (isNaN(qty) || qty <= 0) return;
    if (qty > variant.qty) return;
    onAddVariant(product.id, variant, qty);
    setPendingQty((prev) => ({ ...prev, [variant.id]: '1' }));
  };

  const inCart = totalInCart > 0;

  return (
    <View style={[styles.card, inCart && styles.cardActive]}>

      {/* ── Image + Header ── */}
      <View style={styles.header}>
        <View style={styles.imageBox}>
          {imageUri && !imgError ? (
            <Image
              source={{ uri: imageUri }}
              style={styles.image}
              resizeMode="contain"
              onError={() => setImgError(true)}
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imagePlaceholderText}>No Image</Text>
            </View>
          )}
        </View>

        <View style={styles.info}>
          <View style={styles.infoTopRow}>
            <View style={{ flex: 1, marginRight: 6 }}>
              {designNo ? (
                <Text style={styles.designLabel} numberOfLines={1}>
                  Design: {designNo}
                </Text>
              ) : null}
              <Text style={styles.productName} numberOfLines={2}>
                {product.name}
              </Text>
            </View>
            {inCart && (
              <View style={styles.inCartBadge}>
                <Text style={styles.inCartBadgeText}>{totalInCart} in cart</Text>
              </View>
            )}
          </View>

          {/* Brand */}
          {(product.brand || product.attributes?.brand) && (
            <Text style={styles.metaText}>
              Brand: {product.attributes?.brand || product.brand}
            </Text>
          )}

          {/* ✅ Color — now correctly reads product.color direct column */}
          {productColor ? (
            <Text style={styles.metaText}>Color: {productColor}</Text>
          ) : null}

          {/* Price (simple products only) */}
          {!hasVariants && (
            <Text style={styles.price}>{formatINR(product.price)}</Text>
          )}
        </View>
      </View>

      {/* Attribute pills */}
      {attrPills.length > 0 && (
        <View style={styles.pillRow}>
          {attrPills.map(([k, v]) => (
            <View key={k} style={styles.pill}>
              <Text style={styles.pillText}>{k}: {v}</Text>
            </View>
          ))}
        </View>
      )}

      {/* ── Variants table ── */}
      {hasVariants ? (
        <View style={styles.variantSection}>
          <View style={styles.variantHeaderRow}>
            {showSize && <Text style={[styles.variantHeaderCell, { width: 36 }]}>SIZE</Text>}
            <Text style={[styles.variantHeaderCell, { flex: 1 }]}>PRICE</Text>
            <Text style={[styles.variantHeaderCell, { width: 80, textAlign: 'center' }]}>QTY</Text>
            <View style={{ width: 68 }} />
          </View>

          {(product.variants ?? []).map((variant) => {
            const cv = getCartVariant(variant.id);
            const outOfStock = variant.qty === 0;
            const variantPrice = variant.rate ?? variant.mrp ?? product.price;

            return (
              <View
                key={variant.id}
                style={[
                  styles.variantRow,
                  cv ? styles.variantRowActive : outOfStock ? styles.variantRowDisabled : null,
                ]}
              >
                {showSize && (
                  <View style={[styles.sizeBadge, cv ? styles.sizeBadgeActive : styles.sizeBadgeInactive]}>
                    <Text style={[styles.sizeBadgeText, cv ? styles.sizeBadgeTextActive : styles.sizeBadgeTextInactive]}>
                      {variant.size || '—'}
                    </Text>
                  </View>
                )}

                <View style={{ flex: 1 }}>
                  <Text style={styles.variantPrice}>{formatINR(variantPrice)}</Text>
                  {variant.qty > 0 && (
                    <Text style={styles.stockHint}>{variant.qty} left</Text>
                  )}
                </View>

                {cv ? (
                  <View style={styles.stepper}>
                    <Pressable
                      onPress={() => onUpdateVariantQty(product.id, variant.id, cv.quantity - 1)}
                      style={styles.stepperBtn}
                      hitSlop={6}
                    >
                      <Text style={styles.stepperIcon}>−</Text>
                    </Pressable>
                    <Text style={styles.stepperQty}>{cv.quantity}</Text>
                    <Pressable
                      onPress={() => onUpdateVariantQty(product.id, variant.id, cv.quantity + 1)}
                      disabled={cv.quantity >= variant.qty}
                      style={[styles.stepperBtn, cv.quantity >= variant.qty && styles.stepperBtnDisabled]}
                      hitSlop={6}
                    >
                      <Text style={[styles.stepperIcon, cv.quantity >= variant.qty && styles.stepperIconDisabled]}>+</Text>
                    </Pressable>
                  </View>
                ) : (
                  <TextInput
                    style={[styles.qtyInput, outOfStock && styles.qtyInputDisabled]}
                    keyboardType="number-pad"
                    value={pendingQty[variant.id] ?? '1'}
                    onChangeText={(val) =>
                      setPendingQty((prev) => ({ ...prev, [variant.id]: val }))
                    }
                    editable={!outOfStock}
                    selectTextOnFocus
                  />
                )}

                {cv ? (
                  <Pressable
                    onPress={() => onRemoveVariant(product.id, variant.id)}
                    style={styles.removeBtn}
                    hitSlop={4}
                  >
                    <Text style={styles.removeBtnText}>Remove</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={() => handleAddVariant(variant)}
                    disabled={outOfStock}
                    style={[styles.addBtn, outOfStock && styles.addBtnDisabled]}
                  >
                    <Text style={[styles.addBtnText, outOfStock && styles.addBtnTextDisabled]}>
                      {outOfStock ? 'Out' : 'Add'}
                    </Text>
                  </Pressable>
                )}
              </View>
            );
          })}

          <Text style={styles.variantFooter}>
            {(product.variants ?? []).reduce((s, v) => s + v.qty, 0)} units ·{' '}
            {(product.variants ?? []).length} sizes
          </Text>
        </View>
      ) : (
        /* ── Simple product footer ── */
        <View style={styles.simpleFooter}>
          {product.stock === 0 ? (
            <View style={styles.outOfStockBadge}>
              <Text style={styles.outOfStockText}>Out of Stock</Text>
            </View>
          ) : (
            <View style={[styles.stockBadge, product.stock <= 5 ? styles.stockLow : styles.stockOk]}>
              <Text style={[styles.stockBadgeText, product.stock <= 5 ? styles.stockLowText : styles.stockOkText]}>
                {product.stock <= 5 ? `Only ${product.stock} left` : `Stock: ${product.stock}`}
              </Text>
            </View>
          )}

          {(() => {
            const cv = getCartSimple();
            return cv ? (
              <View style={styles.stepper}>
                <Pressable
                  onPress={() => onUpdateSimpleQty(product.id, cv.quantity - 1)}
                  style={styles.stepperBtn}
                  hitSlop={6}
                >
                  <Text style={styles.stepperIcon}>−</Text>
                </Pressable>
                <Text style={styles.stepperQty}>{cv.quantity}</Text>
                <Pressable
                  onPress={() => onUpdateSimpleQty(product.id, cv.quantity + 1)}
                  disabled={cv.quantity >= product.stock}
                  style={[styles.stepperBtn, cv.quantity >= product.stock && styles.stepperBtnDisabled]}
                  hitSlop={6}
                >
                  <Text style={[styles.stepperIcon, cv.quantity >= product.stock && styles.stepperIconDisabled]}>+</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={() => onAddSimple(product.id)}
                disabled={product.stock === 0}
                style={[styles.addBtn, product.stock === 0 && styles.addBtnDisabled]}
              >
                <Text style={[styles.addBtnText, product.stock === 0 && styles.addBtnTextDisabled]}>
                  + Add
                </Text>
              </Pressable>
            );
          })()}
        </View>
      )}
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const BLUE = '#185FA5';
const BLUE_LIGHT = '#E6F1FB';
const BLUE_MID = '#378ADD';
const RED_LIGHT = '#FCEBEB';
const RED_TEXT = '#A32D2D';
const GREEN_LIGHT = '#EAF3DE';
const GREEN_TEXT = '#3B6D11';
const AMBER_LIGHT = '#FAEEDA';
const AMBER_TEXT = '#854F0B';
const GRAY_BG = '#F3F4F6';
const GRAY_TEXT = '#6B7280';
const BORDER = '#E5E7EB';

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: BORDER,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardActive: {
    borderColor: BLUE_MID,
    borderWidth: 1.5,
  },
  header: {
    flexDirection: 'row',
    padding: 10,
    gap: 10,
  },
  imageBox: {
    width: 72,
    height: 72,
    borderRadius: 8,
    backgroundColor: GRAY_BG,
    overflow: 'hidden',
    flexShrink: 0,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    fontSize: 10,
    color: GRAY_TEXT,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  infoTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 3,
  },
  designLabel: {
    fontSize: 10,
    color: GRAY_TEXT,
    marginBottom: 1,
  },
  productName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#111827',
    lineHeight: 18,
  },
  metaText: {
    fontSize: 11,
    color: GRAY_TEXT,
    marginTop: 1,
  },
  price: {
    fontSize: 14,
    fontWeight: '500',
    color: BLUE,
    marginTop: 4,
  },
  inCartBadge: {
    backgroundColor: BLUE_LIGHT,
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 2,
    flexShrink: 0,
  },
  inCartBadgeText: {
    fontSize: 10,
    fontWeight: '500',
    color: BLUE,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    paddingHorizontal: 10,
    paddingBottom: 6,
  },
  pill: {
    backgroundColor: GRAY_BG,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  pillText: {
    fontSize: 10,
    color: GRAY_TEXT,
    textTransform: 'capitalize',
  },
  variantSection: {
    borderTopWidth: 0.5,
    borderTopColor: BORDER,
    paddingTop: 4,
  },
  variantHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  variantHeaderCell: {
    fontSize: 9,
    fontWeight: '500',
    color: GRAY_TEXT,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  variantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  variantRowActive: {
    backgroundColor: '#EFF6FF',
  },
  variantRowDisabled: {
    opacity: 0.4,
  },
  sizeBadge: {
    width: 36,
    borderRadius: 4,
    paddingVertical: 3,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
  },
  sizeBadgeActive: {
    backgroundColor: BLUE,
    borderColor: BLUE,
  },
  sizeBadgeInactive: {
    backgroundColor: '#fff',
    borderColor: BORDER,
  },
  sizeBadgeText: {
    fontSize: 10,
    fontWeight: '500',
  },
  sizeBadgeTextActive: {
    color: '#fff',
  },
  sizeBadgeTextInactive: {
    color: '#374151',
  },
  variantPrice: {
    fontSize: 12,
    fontWeight: '500',
    color: '#111827',
  },
  stockHint: {
    fontSize: 9,
    color: GRAY_TEXT,
    marginTop: 1,
  },
  qtyInput: {
    width: 80,
    height: 26,
    borderWidth: 0.5,
    borderColor: BORDER,
    borderRadius: 6,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '500',
    color: '#111827',
    backgroundColor: GRAY_BG,
    paddingVertical: 0,
  },
  qtyInputDisabled: {
    opacity: 0.4,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 80,
    borderWidth: 0.5,
    borderColor: BLUE_MID,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  stepperBtn: {
    width: 24,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnDisabled: {
    opacity: 0.3,
  },
  stepperIcon: {
    fontSize: 16,
    color: BLUE,
    lineHeight: 20,
    fontWeight: '400',
  },
  stepperIconDisabled: {
    color: GRAY_TEXT,
  },
  stepperQty: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '500',
    color: BLUE,
  },
  addBtn: {
    width: 68,
    height: 26,
    backgroundColor: BLUE,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnDisabled: {
    backgroundColor: GRAY_BG,
  },
  addBtnText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#fff',
  },
  addBtnTextDisabled: {
    color: GRAY_TEXT,
  },
  removeBtn: {
    width: 68,
    height: 26,
    backgroundColor: RED_LIGHT,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: {
    fontSize: 10,
    fontWeight: '500',
    color: RED_TEXT,
  },
  variantFooter: {
    fontSize: 9,
    color: GRAY_TEXT,
    textAlign: 'right',
    paddingHorizontal: 10,
    paddingBottom: 5,
    paddingTop: 2,
  },
  simpleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 0.5,
    borderTopColor: BORDER,
  },
  outOfStockBadge: {
    borderWidth: 0.5,
    borderColor: '#F09595',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  outOfStockText: {
    fontSize: 11,
    color: RED_TEXT,
  },
  stockBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  stockOk: {
    backgroundColor: GREEN_LIGHT,
    borderWidth: 0.5,
    borderColor: '#C0DD97',
  },
  stockLow: {
    backgroundColor: AMBER_LIGHT,
    borderWidth: 0.5,
    borderColor: '#FAC775',
  },
  stockBadgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  stockOkText: {
    color: GREEN_TEXT,
  },
  stockLowText: {
    color: AMBER_TEXT,
  },
});

export default ProductCart;
