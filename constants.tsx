
import React from 'react';
import { 
  LayoutDashboard, 
  Wallet, 
  Users, 
  HandCoins, 
  Package, 
  Receipt, 
  Building2, 
  Database, 
  BarChart3,
  History,
  TrendingUp,
  FileText
} from 'lucide-react';

export const MENU_ITEMS = [
  { name: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/' },
  { name: 'Account', icon: <Wallet size={20} />, path: '/accounts' },
  { name: 'History', icon: <History size={20} />, path: '/history' },
  { name: 'Customer Due', icon: <Users size={20} />, path: '/customers' },
  { name: 'Cash Memo', icon: <FileText size={20} />, path: '/memo' },
  { name: 'Loan', icon: <HandCoins size={20} />, path: '/loans' },
  { name: 'Stock', icon: <Package size={20} />, path: '/stock' },
  { name: 'Income', icon: <TrendingUp size={20} />, path: '/income' },
  { name: 'Expenses', icon: <Receipt size={20} />, path: '/expenses' },
  { name: 'Rent', icon: <Building2 size={20} />, path: '/rent' },
  { name: 'Data Collect', icon: <Database size={20} />, path: '/data-collect' },
  { name: 'Report', icon: <BarChart3 size={20} />, path: '/report' },
];

export const ACCOUNT_PROVIDERS = [
  { 
    id: 'bkash', 
    name: 'Bkash', 
    color: 'bg-pink-500', 
    logo: 'https://static.vecteezy.com/system/resources/previews/039/340/798/non_2x/bkash-logo-free-vector.jpg' 
  },
  { 
    id: 'nagad', 
    name: 'Nagad', 
    color: 'bg-orange-500', 
    logo: 'https://freelogopng.com/images/all_img/1679248787Nagad-Logo.png' 
  },
  { 
    id: 'rocket', 
    name: 'Rocket', 
    color: 'bg-purple-600', 
    logo: 'https://images.seeklogo.com/logo-png/31/2/dutch-bangla-rocket-logo-png_seeklogo-317692.png' 
  },
  { 
    id: 'flexiload', 
    name: 'Flexiload', 
    color: 'bg-blue-500', 
    logo: 'https://play-lh.googleusercontent.com/wT5LkWz1breJstX7VdEhHkQTrWQFtNIYtIMQZCTuAfq30iJoY7Cx3yGFDfMOpy_EsTI' 
  },
  { 
    id: 'hand_cash', 
    name: 'Hand Cash', 
    color: 'bg-green-600', 
    logo: 'https://static.vecteezy.com/system/resources/previews/037/734/526/non_2x/hand-money-logo-design-icon-a-hand-in-a-fist-squeezing-cash-money-dollar-bills-vector.jpg' 
  },
];

export const CARRIER_LOGOS: Record<string, string> = {
  'GP': 'https://e7.pngegg.com/pngimages/338/159/png-clipart-grameenphone-sony-ericsson-w300i-internet-iphone-alt-attribute-others-internet-mobile-phones-thumbnail.png',
  'Robi': 'https://w7.pngwing.com/pngs/605/410/png-transparent-robi-axiata-limited-bangladesh-axiata-group-bharti-airtel-mobile-phones-business-angle-text-people-thumbnail.png',
  'Airtel': 'https://www.logo.wine/a/logo/Airtel_Uganda/Airtel_Uganda-Logo.wine.svg',
  'BL': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTVYYtFGDu_qifrLAxsA5gd91-W_bS3a1h1LQ&s'
};

export const CARRIERS = ['GP', 'Robi', 'Airtel', 'BL', 'None'];
export const ACCOUNT_TYPES = ['Agent', 'Personal', 'Payment'];
export const FLEXILOAD_TYPES = ['GP', 'Robi', 'Airtel', 'BL'];
