import { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import PhoneAuth from '@/components/PhoneAuth';

// Firebase imports - using CDN approach as specified
declare global {
  interface Window {
    firebase: any;
    __app_id: string;
    __firebase_config: any;
    __initial_auth_token: string;
  }
}

// Load Firebase from CDN
const loadFirebase = () => {
  return new Promise((resolve) => {
    if (window.firebase) {
      resolve(window.firebase);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js';
    script.onload = () => {
      const authScript = document.createElement('script');
      authScript.src = 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js';
      authScript.onload = () => {
        const firestoreScript = document.createElement('script');
        firestoreScript.src = 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js';
        firestoreScript.onload = () => resolve(window.firebase);
        document.head.appendChild(firestoreScript);
      };
      document.head.appendChild(authScript);
    };
    document.head.appendChild(script);
  });
};

interface User {
  id: string;
  name: string;
  phone: string;
  flat: string;
  floor: string;
  block: string;
  role: 'resident' | 'president';
  isVerified: boolean;
}

interface Service {
  id: string;
  title: string;
  description: string;
  offeredByUserId: string;
  price: number;
  timestamp: any;
  userName?: string;
  userFlat?: string;
  category: string;
}


function App() {
  const [currentView, setCurrentView] = useState<'landing' | 'auth' | 'dashboard'>('landing');
  const [userRole, setUserRole] = useState<'resident' | 'president' | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [serviceFormData, setServiceFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const { toast } = useToast();

  // Load services on app start
  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      const response = await fetch('/api/services');
      if (response.ok) {
        const servicesData = await response.json();
        setServices(servicesData);
      }
    } catch (error) {
      console.error('Error loading services:', error);
    }
  };

  const handleAuthSuccess = (userData: User) => {
    setUser(userData);
    setUserRole(userData.role);
    setCurrentView('dashboard');
    loadServices(); // Refresh services after login
  };

  const handleRoleSelection = (role: 'resident' | 'president') => {
    setUserRole(role);
    setCurrentView('auth');
  };


  const handleOfferService = () => {
    if (!user) {
      toast({
        title: "Error",
        description: "Please log in to offer services",
        variant: "destructive"
      });
      return;
    }
    setShowServiceForm(true);
  };

  const handleServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!serviceFormData.title || !serviceFormData.description || !serviceFormData.price || !serviceFormData.category) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const serviceData = {
        title: serviceFormData.title,
        description: serviceFormData.description,
        price: serviceFormData.price,
        category: serviceFormData.category,
        offeredByUserId: user.id
      };

      const response = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serviceData)
      });

      if (response.ok) {
        const newService = await response.json();
        setServices(prev => [...prev, newService]);
        toast({
          title: "Success",
          description: "Service offered successfully!"
        });
        setShowServiceForm(false);
        setServiceFormData({ title: '', description: '', price: '', category: '' });
      } else {
        throw new Error('Failed to create service');
      }
    } catch (error) {
      console.error('Error offering service:', error);
      toast({
        title: "Error",
        description: "Failed to offer service",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredServices = services.filter(service => {
    const matchesSearch = service.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.userName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || service.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const serviceCategories = [
    { value: 'all', label: 'All Categories' },
    { value: 'household', label: 'Household' },
    { value: 'childcare', label: 'Childcare' },
    { value: 'pet-care', label: 'Pet Care' },
    { value: 'tutoring', label: 'Tutoring' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'transport', label: 'Transportation' },
    { value: 'other', label: 'Other' }
  ];

  const handleFindService = () => {
    // Scroll to services section
    const servicesSection = document.getElementById('services-section');
    if (servicesSection) {
      servicesSection.scrollIntoView({ behavior: 'smooth' });
    }
    toast({
      title: "Info",
      description: "Use the search and filters below to find services"
    });
  };

  const LandingPage = () => (
    <div className="min-h-screen gradient-bg community-pattern flex items-center justify-center p-4">
      <div className="max-w-4xl mx-auto text-center">
        <div className="mb-8">
          <h1 className="text-6xl md:text-7xl font-bold text-white mb-4 drop-shadow-lg" data-testid="app-title">
            NeighbörNet
          </h1>
          <p className="text-xl md:text-2xl text-white/90 mb-2" data-testid="app-subtitle">
            Your Hyper-Local Community Marketplace
          </p>
          <p className="text-lg text-white/80" data-testid="app-tagline">
            Connect, Share, and Thrive Together
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          <button 
            onClick={() => handleRoleSelection('resident')}
            className="group bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-8 hover:bg-white/20 transition-all duration-300 card-hover"
            data-testid="button-resident-role"
          >
            <div className="text-center">
              <i className="fas fa-home text-4xl text-white mb-4 group-hover:scale-110 transition-transform"></i>
              <h3 className="text-xl font-semibold text-white mb-2">I'm a Resident</h3>
              <p className="text-white/80">Find services and offer your skills to neighbors</p>
            </div>
          </button>
          
          <button 
            onClick={() => handleRoleSelection('president')}
            className="group bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-8 hover:bg-white/20 transition-all duration-300 card-hover"
            data-testid="button-president-role"
          >
            <div className="text-center">
              <i className="fas fa-users-cog text-4xl text-white mb-4 group-hover:scale-110 transition-transform"></i>
              <h3 className="text-xl font-semibold text-white mb-2">I'm a Community President</h3>
              <p className="text-white/80">Manage and oversee community activities</p>
            </div>
          </button>
        </div>
        
        <div className="mt-12 flex justify-center items-center space-x-6 text-white/60">
          <div className="flex items-center space-x-2">
            <i className="fas fa-shield-alt"></i>
            <span>Secure</span>
          </div>
          <div className="flex items-center space-x-2">
            <i className="fas fa-handshake"></i>
            <span>Trusted</span>
          </div>
          <div className="flex items-center space-x-2">
            <i className="fas fa-map-marker-alt"></i>
            <span>Local</span>
          </div>
        </div>
      </div>
    </div>
  );


  const ResidentDashboard = () => (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-primary" data-testid="header-title">NeighbörNet</h1>
              <div className="hidden sm:block text-sm text-muted-foreground" data-testid="user-id">
                User ID: {user?.id}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-muted-foreground" data-testid="user-info">
                {user?.name} • {user?.flat}
              </div>
              <button
                onClick={() => setCurrentView('landing')}
                className="text-muted-foreground hover:text-foreground"
                data-testid="button-logout"
              >
                <i className="fas fa-sign-out-alt"></i>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2" data-testid="welcome-title">
            Welcome back, {user?.name || 'Neighbor'}!
          </h2>
          <p className="text-muted-foreground" data-testid="welcome-subtitle">
            What would you like to do in your community today?
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <button
            onClick={handleFindService}
            className="bg-primary text-primary-foreground p-6 rounded-lg hover:bg-primary/90 transition-colors card-hover text-left"
            data-testid="button-find-service"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold mb-2">Find a Service</h3>
                <p className="opacity-90">Browse services offered by your neighbors</p>
              </div>
              <i className="fas fa-search text-3xl opacity-80"></i>
            </div>
          </button>
          
          <button
            onClick={handleOfferService}
            className="bg-secondary text-secondary-foreground p-6 rounded-lg hover:bg-secondary/90 transition-colors card-hover text-left"
            data-testid="button-offer-skill"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold mb-2">Offer a Skill</h3>
                <p className="opacity-90">Share your talents with the community</p>
              </div>
              <i className="fas fa-hand-holding-heart text-3xl opacity-80"></i>
            </div>
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Available Services */}
          <div className="lg:col-span-2" id="services-section">
            <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center" data-testid="services-title">
              <i className="fas fa-store mr-2 text-primary"></i>
              Available Services
            </h3>
            
            {/* Search and Filter */}
            <div className="bg-card border border-border rounded-lg p-4 mb-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Search Services</label>
                  <input
                    type="text"
                    placeholder="Search by title, description, or provider..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                    data-testid="input-search-services"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Category</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                    data-testid="select-category-filter"
                  >
                    {serviceCategories.map((category) => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            
            <div className="grid gap-4">
              {filteredServices.length === 0 ? (
                <div className="bg-card border border-border rounded-lg p-6 text-center" data-testid="services-empty">
                  <i className="fas fa-search text-4xl text-muted-foreground mb-4"></i>
                  <p className="text-muted-foreground">
                    {searchTerm || selectedCategory !== 'all' 
                      ? 'No services match your search criteria. Try adjusting your filters.' 
                      : 'No services available yet. Be the first to offer a service!'}
                  </p>
                </div>
              ) : (
                filteredServices.map((service) => (
                  <div key={service.id} className="bg-card border border-border rounded-lg p-6 card-hover" data-testid={`service-card-${service.id}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="text-lg font-semibold text-foreground" data-testid={`service-title-${service.id}`}>
                          {service.title}
                        </h4>
                        <span className="bg-muted text-muted-foreground px-2 py-1 rounded-full text-xs">
                          {serviceCategories.find(cat => cat.value === service.category)?.label || service.category}
                        </span>
                      </div>
                      <span className="bg-accent/10 text-accent px-3 py-1 rounded-full text-sm font-medium" data-testid={`service-price-${service.id}`}>
                        ${service.price}/hr
                      </span>
                    </div>
                    <p className="text-muted-foreground mb-4" data-testid={`service-description-${service.id}`}>
                      {service.description}
                    </p>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <i className="fas fa-user"></i>
                        <span data-testid={`service-user-${service.id}`}>{service.userName}</span>
                        <span>•</span>
                        <span data-testid={`service-flat-${service.id}`}>{service.userFlat}</span>
                      </div>
                      <button 
                        className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors text-sm"
                        data-testid={`button-contact-${service.id}`}
                      >
                        Contact
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Profile Card */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h4 className="font-semibold text-foreground mb-4 flex items-center" data-testid="profile-title">
                <i className="fas fa-user-circle mr-2 text-primary"></i>
                My Profile
              </h4>
              <img 
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=150&h=150" 
                alt="Profile picture" 
                className="w-16 h-16 rounded-full mx-auto mb-4 object-cover"
                data-testid="profile-image"
              />
              <div className="text-center mb-4">
                <h5 className="font-medium text-foreground" data-testid="profile-name">{user?.name}</h5>
                <p className="text-sm text-muted-foreground" data-testid="profile-flat">{user?.flat}</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Points Earned</span>
                  <span className="text-sm font-medium text-accent" data-testid="profile-points">245</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Services Used</span>
                  <span className="text-sm font-medium" data-testid="profile-services-used">12</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Services Offered</span>
                  <span className="text-sm font-medium" data-testid="profile-services-offered">3</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-border">
                <h6 className="text-sm font-medium text-foreground mb-2">Badges</h6>
                <div className="flex space-x-2" data-testid="profile-badges">
                  <span className="bg-accent/10 text-accent px-2 py-1 rounded text-xs">Helper</span>
                  <span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs">Trusted</span>
                </div>
              </div>
            </div>

            {/* AI Suggestions */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h4 className="font-semibold text-foreground mb-4 flex items-center" data-testid="ai-suggestions-title">
                <i className="fas fa-robot mr-2 text-secondary"></i>
                AI Suggestions
              </h4>
              <div className="space-y-3" data-testid="ai-suggestions">
                <div className="flex items-start space-x-3">
                  <i className="fas fa-lightbulb text-secondary mt-1"></i>
                  <div className="flex-1">
                    <p className="text-sm text-foreground">Consider offering "Plant Care" - several neighbors have shown interest!</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <i className="fas fa-handshake text-secondary mt-1"></i>
                  <div className="flex-1">
                    <p className="text-sm text-foreground">Mike R. in B-101 offers tutoring that might interest you.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <i className="fas fa-calendar text-secondary mt-1"></i>
                  <div className="flex-1">
                    <p className="text-sm text-foreground">Weekend babysitting demand is high in your building.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Service Creation Modal */}
      {showServiceForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-lg w-full max-w-md">
            <div className="flex justify-between items-center p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">Offer a Service</h3>
              <button
                onClick={() => setShowServiceForm(false)}
                className="text-muted-foreground hover:text-foreground"
                data-testid="button-close-service-form"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <form onSubmit={handleServiceSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Service Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Dog Walking, Tutoring, Home Cleaning"
                  value={serviceFormData.title}
                  onChange={(e) => setServiceFormData({...serviceFormData, title: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                  data-testid="input-service-title"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Category</label>
                <select
                  required
                  value={serviceFormData.category}
                  onChange={(e) => setServiceFormData({...serviceFormData, category: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                  data-testid="select-service-category"
                >
                  <option value="">Select a category</option>
                  {serviceCategories.slice(1).map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Description</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe your service, availability, and any special qualifications..."
                  value={serviceFormData.description}
                  onChange={(e) => setServiceFormData({...serviceFormData, description: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background resize-none"
                  data-testid="textarea-service-description"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Price per Hour ($)</label>
                <input
                  type="number"
                  required
                  min="1"
                  step="0.01"
                  placeholder="0.00"
                  value={serviceFormData.price}
                  onChange={(e) => setServiceFormData({...serviceFormData, price: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                  data-testid="input-service-price"
                />
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowServiceForm(false)}
                  className="flex-1 bg-muted text-muted-foreground py-2 rounded-md hover:bg-muted/80 transition-colors"
                  data-testid="button-cancel-service"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-primary text-primary-foreground py-2 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="button-submit-service"
                >
                  {loading ? 'Creating...' : 'Offer Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  const PresidentDashboard = () => (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-primary" data-testid="header-title">NeighbörNet</h1>
              <span className="bg-secondary/10 text-secondary px-3 py-1 rounded-full text-sm font-medium" data-testid="manager-badge">
                Community Manager
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-muted-foreground" data-testid="user-info">
                {user?.name} • {user?.flat}
              </div>
              <button
                onClick={() => setCurrentView('landing')}
                className="text-muted-foreground hover:text-foreground"
                data-testid="button-logout"
              >
                <i className="fas fa-sign-out-alt"></i>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2" data-testid="dashboard-title">
            Community Dashboard
          </h2>
          <p className="text-muted-foreground" data-testid="dashboard-subtitle">
            Manage your community and oversee neighborhood activities
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Residents</p>
                <p className="text-2xl font-bold text-foreground" data-testid="stat-residents">{residents.length}</p>
              </div>
              <i className="fas fa-users text-primary text-2xl"></i>
            </div>
          </div>
          
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Services</p>
                <p className="text-2xl font-bold text-foreground" data-testid="stat-services">{services.length}</p>
              </div>
              <i className="fas fa-handshake text-secondary text-2xl"></i>
            </div>
          </div>
          
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">This Month</p>
                <p className="text-2xl font-bold text-foreground" data-testid="stat-month">24</p>
              </div>
              <i className="fas fa-chart-line text-accent text-2xl"></i>
            </div>
          </div>
          
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Approvals</p>
                <p className="text-2xl font-bold text-foreground" data-testid="stat-pending">2</p>
              </div>
              <i className="fas fa-clock text-orange-500 text-2xl"></i>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Residents Management */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-foreground flex items-center" data-testid="residents-title">
                <i className="fas fa-users mr-2 text-primary"></i>
                Registered Residents
              </h3>
              <button 
                className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors text-sm"
                data-testid="button-add-resident"
              >
                Add Resident
              </button>
            </div>
            
            <div className="space-y-4">
              {residents.length === 0 ? (
                <div className="text-center py-8" data-testid="residents-empty">
                  <i className="fas fa-users text-4xl text-muted-foreground mb-4"></i>
                  <p className="text-muted-foreground">No residents registered yet.</p>
                </div>
              ) : (
                residents.map((resident) => (
                  <div key={resident.uid} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg" data-testid={`resident-card-${resident.uid}`}>
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <i className="fas fa-user text-primary"></i>
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground" data-testid={`resident-name-${resident.uid}`}>{resident.name}</h4>
                        <p className="text-sm text-muted-foreground" data-testid={`resident-details-${resident.uid}`}>
                          {resident.flat} • Floor {resident.floor} • Block {resident.block}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="bg-accent/10 text-accent px-2 py-1 rounded text-xs">Active</span>
                      <button className="text-muted-foreground hover:text-foreground" data-testid={`button-resident-menu-${resident.uid}`}>
                        <i className="fas fa-ellipsis-v"></i>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Services Overview */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-foreground flex items-center" data-testid="services-overview-title">
                <i className="fas fa-store mr-2 text-secondary"></i>
                Services Summary
              </h3>
              <button 
                className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md hover:bg-secondary/90 transition-colors text-sm"
                data-testid="button-view-all-services"
              >
                View All
              </button>
            </div>
            
            <div className="space-y-4">
              {services.length === 0 ? (
                <div className="text-center py-8" data-testid="services-overview-empty">
                  <i className="fas fa-store text-4xl text-muted-foreground mb-4"></i>
                  <p className="text-muted-foreground">No services offered yet.</p>
                </div>
              ) : (
                services.map((service) => (
                  <div key={service.id} className="p-4 bg-muted/50 rounded-lg" data-testid={`service-overview-${service.id}`}>
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-foreground" data-testid={`service-overview-title-${service.id}`}>{service.title}</h4>
                      <span className="bg-accent/10 text-accent px-2 py-1 rounded text-xs" data-testid={`service-overview-price-${service.id}`}>
                        ${service.price}/hr
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2" data-testid={`service-overview-description-${service.id}`}>{service.description}</p>
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span data-testid={`service-overview-user-${service.id}`}>Offered by {service.userName}</span>
                      <span data-testid={`service-overview-flat-${service.id}`}>{service.userFlat}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {/* Approval Actions */}
            <div className="mt-6 pt-6 border-t border-border">
              <h4 className="font-medium text-foreground mb-3 flex items-center" data-testid="quick-actions-title">
                <i className="fas fa-check-circle mr-2 text-accent"></i>
                Quick Actions
              </h4>
              <div className="space-y-2">
                <button 
                  className="w-full bg-accent/10 text-accent p-3 rounded-lg hover:bg-accent/20 transition-colors text-left text-sm"
                  data-testid="button-approve-residents"
                >
                  <i className="fas fa-user-plus mr-2"></i>
                  Approve 2 pending residents
                </button>
                <button 
                  className="w-full bg-primary/10 text-primary p-3 rounded-lg hover:bg-primary/20 transition-colors text-left text-sm"
                  data-testid="button-send-announcement"
                >
                  <i className="fas fa-bullhorn mr-2"></i>
                  Send community announcement
                </button>
                <button 
                  className="w-full bg-secondary/10 text-secondary p-3 rounded-lg hover:bg-secondary/20 transition-colors text-left text-sm"
                  data-testid="button-view-analytics"
                >
                  <i className="fas fa-chart-bar mr-2"></i>
                  View community analytics
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );


  return (
    <div className="font-sans">
      {currentView === 'landing' && <LandingPage />}
      {currentView === 'auth' && userRole && (
        <PhoneAuth 
          onAuthSuccess={handleAuthSuccess}
          onBack={() => setCurrentView('landing')}
          userRole={userRole}
        />
      )}
      {currentView === 'dashboard' && userRole === 'resident' && <ResidentDashboard />}
      {currentView === 'dashboard' && userRole === 'president' && <PresidentDashboard />}
      
    </div>
  );
}

export default App;
