import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

import { SHOP_NAME, SHOP_SUPPORT_CONTACTS, ShopSupportContact } from '@/constants/config';
import { formatPhoneDisplay } from '@/services/auth';
import { openPhoneCall, openWhatsApp } from '@/services/whatsapp';

type ContactAction = 'call' | 'whatsapp';

export function ShopSupportLinks() {
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerAction, setPickerAction] = useState<ContactAction>('call');

  if (SHOP_SUPPORT_CONTACTS.length === 0) return null;

  const openPicker = (action: ContactAction) => {
    setPickerAction(action);
    setPickerVisible(true);
  };

  const handleContactPress = (contact: ShopSupportContact) => {
    setPickerVisible(false);

    if (pickerAction === 'call') {
      void openPhoneCall(contact.phone);
      return;
    }

    void openWhatsApp(contact.phone, `Hi ${SHOP_NAME}, I need help with my order.`);
  };

  const pickerTitle = pickerAction === 'call' ? 'Choose number to call' : 'Choose number for WhatsApp';

  return (
    <>
      <View className="flex-row gap-2">
        <Pressable
          onPress={() => openPicker('call')}
          accessibilityRole="button"
          accessibilityLabel="Call shop"
          className="flex-row items-center rounded-full bg-white/20 px-3 py-1.5 active:opacity-80"
        >
          <Ionicons name="call" size={14} color="#FFFFFF" />
          <Text className="ml-1 text-xs font-semibold text-white">Call</Text>
        </Pressable>

        <Pressable
          onPress={() => openPicker('whatsapp')}
          accessibilityRole="button"
          accessibilityLabel="WhatsApp shop"
          className="flex-row items-center rounded-full bg-white/20 px-3 py-1.5 active:opacity-80"
        >
          <Ionicons name="logo-whatsapp" size={14} color="#FFFFFF" />
          <Text className="ml-1 text-xs font-semibold text-white">WhatsApp</Text>
        </Pressable>
      </View>

      <Modal
        visible={pickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerVisible(false)}
      >
        <Pressable
          className="flex-1 justify-end bg-black/45"
          onPress={() => setPickerVisible(false)}
        >
          <Pressable className="rounded-t-3xl bg-surface px-4 pb-8 pt-4" onPress={(e) => e.stopPropagation()}>
            <View className="mb-4 items-center">
              <View className="h-1 w-10 rounded-full bg-border" />
            </View>

            <Text className="text-base font-bold text-foreground">{pickerTitle}</Text>
            <Text className="mt-1 text-sm text-muted">Select a shop contact</Text>

            <View className="mt-4 gap-2">
              {SHOP_SUPPORT_CONTACTS.map((contact) => (
                <Pressable
                  key={`${contact.label}-${contact.phone}`}
                  onPress={() => handleContactPress(contact)}
                  className="flex-row items-center rounded-xl border border-border bg-background px-4 py-3 active:opacity-80"
                >
                  <View
                    className={`mr-3 h-10 w-10 items-center justify-center rounded-full ${
                      pickerAction === 'call' ? 'bg-primary-light' : 'bg-whatsapp/15'
                    }`}
                  >
                    <Ionicons
                      name={pickerAction === 'call' ? 'call' : 'logo-whatsapp'}
                      size={18}
                      color={pickerAction === 'call' ? '#1B7A4E' : '#25D366'}
                    />
                  </View>

                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-foreground">{contact.label}</Text>
                    <Text className="mt-0.5 text-[15px] font-bold text-primary">
                      {formatPhoneDisplay(contact.phone)}
                    </Text>
                  </View>

                  <Ionicons name="chevron-forward" size={18} color="#5C6B63" />
                </Pressable>
              ))}
            </View>

            <Pressable
              onPress={() => setPickerVisible(false)}
              className="mt-4 items-center rounded-xl border border-border py-3 active:opacity-80"
            >
              <Text className="text-sm font-semibold text-muted">Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
