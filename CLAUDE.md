# Claude Assistant Memory

This file contains important context and reminders for Claude when working on this project.

## Project Overview
- Airport Flight Data Collector - Automated system for collecting flight data from major airports
- Built with Node.js following SOLID principles
- Supports multiple storage backends (local, Cloudflare D1, Oracle Cloud)
- Currently collecting from SFO, YYZ, and YVR airports

## Important Reminders

### 🔴 Git Workflow - CRITICAL
**ALWAYS commit and push changes after each small step!**
- Make frequent, small commits with descriptive messages
- Push to remote immediately after committing
- Don't accumulate multiple changes before pushing
- Example workflow:
  ```bash
  # After EACH file change or small task:
  git add -A
  git status  # Verify changes
  git commit -m "Descriptive message about the specific change"
  git push origin <branch-name>
  ```

### Current Branch
- Working on: `database-deployment`
- Main branch: `main`
- Always check current branch with `git branch` before starting work

### Project Structure
- Source code in `src/` following SOLID architecture
- Documentation in `docs/` (recently reorganized into topic-based guides)
- Tests in `tests/`
- Scripts in `scripts/`
- GitHub Actions in `.github/workflows/`

### Key Technical Decisions
1. **Architecture**: SOLID principles with dependency injection
2. **Storage**: Multiple backends with local as default
3. **HTTP Clients**: Multiple implementations (fetch, curl, puppeteer)
4. **Error Handling**: Graceful failures with detailed context
5. **Configuration**: Environment-based with sensible defaults

### Documentation Structure (as of Jan 2025)
- `getting-started.md` - Quick start guide
- `architecture.md` - Technical architecture and API
- `database-setup.md` - Comprehensive database guide
- `operations.md` - Production deployment
- `troubleshooting.md` - Problem solving
- `development.md` - Contributing guide
- `api-reference.md` - Complete API docs
- `project-info.md` - Status and roadmap

### Common Tasks
1. **Adding new airports**: Extend BaseAirportCollector
2. **Testing**: Run `npm test` before committing
3. **Documentation**: Update relevant docs with any changes
4. **Database setup**: Refer users to `docs/database-setup.md`

### Code Style
- Use ES6+ features
- Async/await over promises
- Descriptive variable names
- No unnecessary comments
- Follow existing patterns

### Testing
- Always run tests before committing
- Add tests for new features
- Maintain >80% coverage

### User Interaction Guidelines
- Be concise and direct
- Provide code examples
- Reference documentation files
- Suggest next steps

## Recent Updates (Jan 2025)
- Complete documentation reorganization
- Fixed GitHub Actions database workflow
- Updated roadmap with Q2 2025 progress
- Added comprehensive troubleshooting guide
- Version 2.1.0 released

## Common Issues & Solutions
1. **Module not found**: Run `npm install`
2. **Database connection**: Check credentials in `.env`
3. **Bot protection**: Use curl client with `HTTP_CLIENT_TYPE=curl`
4. **Timeout**: Increase with `HTTP_TIMEOUT=60000`

## Next Priorities (Q2 2025)
- Web dashboard (React/Next.js) - 40% complete
- REST API v1 - Development phase
- New airports: LAX, ORD, ATL
- Docker support
- Performance monitoring

---
*Last updated: January 26, 2025*