# GitHub and Render deployment

## 1. Create the GitHub repository

1. Sign in to GitHub.
2. Create a new repository named `study-mark`.
3. Keep it public or private according to your preference. Render must be granted access if it is private.
4. Do not initialize it with another README, license, or `.gitignore` if you are uploading this complete project.
5. Upload all files from the project root, including `.github`, `app`, `public`, `tests`, `Dockerfile`, `composer.json`, `composer.lock`, and `render.yaml`.
6. Confirm that `vendor/`, `.env`, and local tool folders were not uploaded.

If Git is available locally, the equivalent workflow is:

```bash
git init
git add .
git commit -m "Build Study Mark"
git branch -M main
git remote add origin <your-repository-url>
git push -u origin main
```

## 2. Confirm GitHub checks

Open the repository's Actions tab. The “Quality checks” workflow should validate Composer files, install dependencies, validate every quiz package, and run the PHPUnit suite.

Resolve a failed check before deploying.

## 3. Create the Render service

The simplest route is a Render Blueprint:

1. Sign in to Render.
2. Choose **New** and then **Blueprint**.
3. Connect the GitHub account that owns the repository.
4. Select the Study Mark repository.
5. Confirm that Render found `render.yaml` in the repository root.
6. Approve creation of the `study-mark` web service.

The Blueprint selects the Docker runtime, free plan, `/health` health check, automatic deployment after GitHub checks, and the production CodeIgniter environment. No database, persistent disk, or secret is required.

## 4. Verify the first deployment

In the Render deployment log, confirm that Composer installs production dependencies, `php spark quizzes:validate` passes, Apache binds to Render's `PORT`, and `/health` becomes healthy.

Open the assigned `onrender.com` URL. On a free service, the first request after inactivity can take longer while the instance starts.

## 5. Add future quizzes

1. Create or receive the quiz package.
2. Upload its folder into `public/content/quizzes/` on GitHub.
3. Commit the change to `main`.
4. Wait for the GitHub quality check.
5. Render deploys after the check passes.
6. Open the live site and test the new quiz.

If validation fails, the previous successful deployment remains available while you correct the quiz file.

## Troubleshooting

### Render reports that no port is available

Confirm that `docker/entrypoint.sh` exists and that `Dockerfile` uses it. It configures Apache to listen on Render's `PORT`, normally `10000`.

### A quiz does not appear

- Confirm its folder contains `quiz.json`.
- Confirm the folder name matches the quiz `id` exactly.
- Check the GitHub Actions and Render build logs.
- Run `php spark quizzes:validate` locally if possible.

### An image is missing

- Check filename capitalization.
- Confirm it is inside that quiz's `assets` folder.
- Confirm its path in JSON starts with `assets/`.
- Confirm GitHub contains the image file, not only the local computer.

### Progress disappeared

Progress is stored in the current browser. It does not synchronize between devices and can be removed when browser site data is cleared.
