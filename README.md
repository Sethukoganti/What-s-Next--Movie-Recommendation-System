# 🎬 CineVerse - Premium Movie Recommendation Platform

A stunning, Netflix-inspired movie and series recommendation website built with **React**, **Vite**, **Framer Motion**, and **Three.js**. Experience beautiful animations, interactive 3D elements, and a seamless dark/light theme toggle.

![CineVerse Preview](https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200&h=600&fit=crop)

## ✨ Features

### 🎯 Content Sections
- **Hero Section** with interactive 3D rotating sphere
- **Trending This Week** - Latest hot movies and series
- **Top Movies of All Time** - IMDb's finest selections
- **Movies by Genre** - Explore Action, Drama, Comedy, Romance, Sci-Fi, Horror, Thriller, and Animation
- **Top Series of All Time** - Best TV shows ever made
- **Series by Genre** - Discover series across Crime, Drama, Sci-Fi, Comedy, Fantasy, and Thriller

### 🎨 Visual Experience
- **Smooth Animations** powered by Framer Motion
- **Interactive 3D Sphere** built with Three.js
- **Floating Particles** background effect
- **Custom Cursor** that expands on hover
- **Scroll Progress** indicator
- **Netflix-authentic** color scheme (#E50914)
- **Glassmorphism** UI elements
- **Professional Shadows** and lighting effects

### 🌓 Theme System
- **Dark Mode** (Default) - Deep blacks with vibrant reds
- **Light Mode** - Clean whites with consistent branding
- **Instant Toggle** with smooth transitions
- **Persistent Theme** saved to localStorage

### 🎭 Interactive Features
- **Hover over movie cards** → Watch them scale and lift
- **Click theme toggle** (Sun/Moon icon) → Instant light/dark switch
- **Drag the 3D sphere** → Interactive rotation
- **Switch genre tabs** → Smooth content transitions
- **Hover links/buttons** → Custom cursor expands
- **Scroll down** → Watch elements animate into view

### 📱 Responsive Design
The site looks perfect on:
- 🖥️ **Desktop** (full features)
- 💻 **Laptop** (optimized layout)
- 📱 **Tablet** (adapted navigation)
- 📱 **Mobile** (touch-optimized)

## 🚀 Tech Stack

- **React 18** - Modern UI library
- **Vite** - Lightning-fast build tool
- **Framer Motion** - Production-ready animation library
- **Three.js** - 3D graphics engine
- **Lucide React** - Beautiful icon system
- **CSS Custom Properties** - Dynamic theming

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/cineverse.git
cd cineverse

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🏗️ Project Structure

```
cineverse/
├── src/
│   ├── components/
│   │   ├── Hero3D.jsx              # 3D rotating sphere hero
│   │   ├── Navigation.jsx          # Sticky navigation bar
│   │   ├── TrendingSection.jsx     # Trending movies & series
│   │   ├── TopMoviesSection.jsx    # Top rated movies
│   │   ├── GenreSection.jsx        # Movies by genre
│   │   ├── SeriesSection.jsx       # Series sections
│   │   ├── FloatingParticles.jsx   # Background particles
│   │   ├── MouseFollower.jsx       # Custom cursor
│   │   ├── ScrollProgress.jsx      # Scroll indicator
│   │   └── Footer.jsx              # Footer section
│   ├── context/
│   │   └── ThemeContext.jsx        # Theme state management
│   ├── App.jsx                     # Main app component
│   ├── App.css                     # Global app styles
│   └── index.css                   # Base styles & theme vars
├── index.html
├── vite.config.js
└── package.json
```

## 🎨 Customization

### Change Theme Colors

Edit `src/index.css`:

```css
:root {
  --accent-primary: #e50914;      /* Netflix Red */
  --accent-secondary: #b20710;
  --accent-tertiary: #831010;
}
```

### Add More Movies

Edit data arrays in component files:
- `TrendingSection.jsx` - Trending content
- `TopMoviesSection.jsx` - Top movies
- `GenreSection.jsx` - Genre-specific movies
- `SeriesSection.jsx` - Series content

### Modify Animations

Adjust Framer Motion variants in any component:

```jsx
initial={{ opacity: 0, y: 50 }}
whileInView={{ opacity: 1, y: 0 }}
transition={{ duration: 0.8 }}
```

## 🎯 Performance

- ⚡ Vite for instant HMR
- 🎨 CSS Custom Properties for zero-cost theming
- 🖼️ Lazy loading images
- 🎭 GPU-accelerated animations
- 📦 Code splitting ready
- 🗜️ Optimized production builds

## 🌐 Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Opera (latest)

## 📝 License

MIT License - feel free to use this project for learning or portfolio purposes!

## 🙏 Credits

- **UI Inspiration**: Netflix
- **Icons**: Lucide React
- **Fonts**: Netflix Sans (official)
- **Images**: Unsplash
- **3D Library**: Three.js
- **Animations**: Framer Motion

## 🐛 Known Issues

None! Everything is **bug-free, smooth, and production-ready**! 🎉

## 🤝 Contributing

Contributions are welcome! Feel free to:
1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📧 Contact

Your Name - [@yourtwitter](https://twitter.com/yourtwitter)

Project Link: [https://github.com/yourusername/cineverse](https://github.com/yourusername/cineverse)

---

⭐ **Star this repo if you found it helpful!** ⭐

Built with ❤️ and ☕ by developers who love movies!
