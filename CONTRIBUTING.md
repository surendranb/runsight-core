# 🤝 Contributing to RunSight Web

Thank you for your interest in contributing to RunSight Web! This guide will help you get started with contributing to this open-source running analytics project.

## 🎯 Project Vision

RunSight Web aims to be the **best open-source running analytics dashboard** that:
- Provides meaningful insights from Strava data
- Maintains user privacy and data security
- Offers easy self-deployment for personal use
- Welcomes contributions from the running and developer communities

## 🚀 Quick Start for Contributors

### 1. Set Up Development Environment
```bash
# Fork the repository on GitHub
git clone https://github.com/YOUR_USERNAME/runsight-web.git
cd runsight-web

# Install dependencies
npm install

# Run setup validation
npm run setup

# Start development server
npm run dev
```

### 2. Create Development Environment Variables
```bash
# Copy the example file
cp .env.example .env

# Fill in your API keys for testing
# See docs/DEPLOYMENT.md for how to get these
```

### 3. Test Your Setup
```bash
# Build the project
npm run build

# Run linting
npm run lint

# Start development server
npm run dev
```

---

## 📋 Types of Contributions

We welcome various types of contributions:

### 🐛 Bug Reports
- Found a bug? Please report it!
- Use the bug report template
- Include steps to reproduce
- Provide error messages and logs

### ✨ Feature Requests  
- Have an idea for a new feature?
- Use the feature request template
- Explain the use case and benefit
- Consider if it fits the project vision

### 🔧 Code Contributions
- Bug fixes
- New features
- Performance improvements
- Code quality improvements

### 📚 Documentation
- Improve setup guides
- Add troubleshooting tips
- Create tutorials
- Fix typos and clarity issues

### 🎨 Design & UX
- UI/UX improvements
- Accessibility enhancements
- Mobile responsiveness
- Visual design updates

---

## 🏗️ Development Guidelines

### Code Style
We use **TypeScript** and **ESLint** for code quality:

```bash
# Check code style
npm run lint

# Build and type check
npm run build
```

**Key principles:**
- ✅ Use TypeScript for all new code
- ✅ Follow existing code patterns
- ✅ Write meaningful variable and function names
- ✅ Add comments for complex logic
- ✅ Keep functions small and focused

### Component Structure
```typescript
// Good component structure
interface ComponentProps {
  user: User;
  data: RunData[];
  onAction: (id: string) => void;
}

export const MyComponent: React.FC<ComponentProps> = ({ 
  user, 
  data, 
  onAction 
}) => {
  // Component logic here
  return (
    <div className="component-container">
      {/* JSX here */}
    </div>
  );
};
```

### Styling Guidelines
We use **Tailwind CSS** for styling:

```jsx
// Good: Use Tailwind classes
<div className="bg-white rounded-lg shadow-md p-4">
  <h2 className="text-xl font-bold text-gray-900">Title</h2>
</div>

// Avoid: Custom CSS unless absolutely necessary
```

### State Management
- Use React hooks (`useState`, `useEffect`, `useMemo`)
- Keep state close to where it's used
- Use context for truly global state only

---

## 🔒 Security Guidelines

RunSight Web prioritizes user privacy and security:

### API Keys and Secrets
- ❌ **Never** commit API keys to Git
- ✅ Use environment variables for all secrets
- ✅ Keep credentials server-side only (Netlify Functions)
- ✅ Document required environment variables

### Database Security
- ✅ Use Row Level Security (RLS) for all user data
- ✅ Validate all user inputs
- ✅ Use parameterized queries
- ✅ Test with different user accounts

### Frontend Security
- ✅ No sensitive data in localStorage
- ✅ Validate all API responses
- ✅ Handle errors gracefully
- ✅ Use HTTPS for all external requests

---

## 🧪 Testing Guidelines

### Manual Testing
Before submitting a PR, test:
- [ ] Authentication flow works
- [ ] Data sync works with real Strava data
- [ ] Dashboard displays correctly
- [ ] Mobile responsiveness
- [ ] Error handling

### Automated Testing
We're building up our test suite:
- Unit tests for utility functions
- Integration tests for API functions
- End-to-end tests for critical user flows

```bash
# Run tests (when available)
npm test
```

---

## 📝 Pull Request Process

### 1. Before You Start
- Check existing issues and PRs to avoid duplicates
- Create an issue to discuss large changes
- Fork the repository and create a feature branch

### 2. Making Changes
```bash
# Create a feature branch
git checkout -b feature/your-feature-name

# Make your changes
# Test thoroughly

# Commit with clear messages
git commit -m "feat: add weather trend analysis

- Add weather trend chart to insights page
- Include temperature and humidity correlations
- Add tests for weather data processing"
```

### 3. Commit Message Format
We use conventional commits:
```
type(scope): description

- Detailed change 1
- Detailed change 2
- Detailed change 3
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### 4. Submitting Your PR
- Push your branch to your fork
- Create a pull request with:
  - Clear title and description
  - Reference any related issues
  - Include screenshots for UI changes
  - List testing steps

### 5. PR Review Process
- Maintainers will review your PR
- Address any feedback promptly
- Keep your branch up to date with main
- Be patient - reviews take time!

---

## 🏛️ Project Architecture

Understanding the codebase structure:

### Frontend (`src/`)
```
src/
├── components/          # React components
│   ├── common/         # Reusable UI components
│   ├── dashboard/      # Dashboard-specific components
│   └── insights/       # Insights page components
├── hooks/              # Custom React hooks
├── lib/                # Utility functions and services
├── types/              # TypeScript type definitions
└── main.tsx           # Application entry point
```

### Backend (`netlify/functions/`)
```
netlify/functions/
├── auth-strava.js      # Strava OAuth handling
├── get-runs.js         # Fetch user runs from database
└── sync-data.js        # Sync data from Strava API
```

### Database (`supabase/migrations/`)
- PostgreSQL database with Row Level Security
- Migrations for schema changes
- User data isolation and privacy

### Key Technologies
- **Frontend:** React 18, TypeScript, Tailwind CSS
- **Backend:** Netlify Functions, Node.js
- **Database:** Supabase (PostgreSQL)
- **Build:** Vite, ESLint
- **APIs:** Strava, OpenWeatherMap, Google AI (optional)

---

## 🎨 Design Principles

### User Experience
- **Cognitive Load Awareness:** Don't overwhelm users with information
- **Progressive Disclosure:** Show essential info first, details on demand
- **Mobile First:** Design for mobile, enhance for desktop
- **Accessibility:** Follow WCAG guidelines

### Data Visualization
- **Meaningful Insights:** Every chart should tell a story
- **Context Matters:** Provide context for all metrics
- **Outlier Handling:** Filter unrealistic data points
- **Performance Focus:** Optimize for large datasets

### Code Quality
- **Readability:** Code should be self-documenting
- **Maintainability:** Easy to modify and extend
- **Performance:** Efficient rendering and data processing
- **Security:** Privacy and security by design

---

## 🐛 Issue Templates

### Bug Report Template
```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment:**
- Browser: [e.g. Chrome, Safari]
- Version: [e.g. 22]
- Device: [e.g. iPhone6, Desktop]

**Additional context**
Any other context about the problem.
```

### Feature Request Template
```markdown
**Is your feature request related to a problem?**
A clear description of what the problem is.

**Describe the solution you'd like**
A clear description of what you want to happen.

**Describe alternatives you've considered**
Other solutions you've considered.

**Additional context**
Any other context or screenshots about the feature request.

**Would you be willing to implement this?**
Let us know if you'd like to work on this feature.
```

---

## 🌟 Recognition

Contributors are recognized in several ways:

### Contributors List
- All contributors are listed in README.md
- Significant contributors get special recognition
- First-time contributors get a welcome message

### Types of Recognition
- **Code Contributors:** Listed with GitHub profile
- **Documentation Contributors:** Recognized for improving docs
- **Bug Reporters:** Credited for finding and reporting issues
- **Community Helpers:** Recognized for helping other users

---

## 📞 Getting Help

### Where to Ask Questions
1. **GitHub Discussions:** General questions and community help
2. **GitHub Issues:** Bug reports and feature requests
3. **Code Reviews:** Questions about specific implementations

### Response Times
- **Bug reports:** Within 48 hours
- **Feature requests:** Within 1 week
- **Pull requests:** Within 1 week
- **Questions:** Within 24-48 hours

### Community Guidelines
- Be respectful and inclusive
- Help others learn and grow
- Share knowledge and experiences
- Focus on constructive feedback

---

## 🎉 Your First Contribution

New to open source? Here are some good first issues:

### Easy Contributions
- Fix typos in documentation
- Improve error messages
- Add missing TypeScript types
- Update dependencies

### Medium Contributions  
- Add new insight calculations
- Improve mobile responsiveness
- Add data export features
- Enhance accessibility

### Advanced Contributions
- Performance optimizations
- New API integrations
- Advanced data visualizations
- Security improvements

### Finding Issues
Look for issues labeled:
- `good first issue` - Perfect for beginners
- `help wanted` - Community help needed
- `documentation` - Documentation improvements
- `enhancement` - New features

---

## 📜 Code of Conduct

### Our Pledge
We pledge to make participation in our project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Our Standards
**Positive behavior includes:**
- Using welcoming and inclusive language
- Being respectful of differing viewpoints
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

**Unacceptable behavior includes:**
- Harassment of any kind
- Discriminatory language or actions
- Personal attacks or insults
- Publishing others' private information
- Other conduct inappropriate in a professional setting

### Enforcement
Project maintainers are responsible for clarifying standards and will take appropriate action in response to unacceptable behavior.

---

## 🙏 Thank You

Thank you for contributing to RunSight Web! Your contributions help make running analytics accessible to everyone. Whether you're fixing a typo, adding a feature, or helping other users, every contribution matters.

**Happy coding and happy running! 🏃‍♂️📊**

---

*This contributing guide is a living document. If you have suggestions for improvements, please open an issue or submit a pull request!*