# Publishing notes (verified 2026-10-13 by the test session)

- Token in env IG_ACCESS_TOKEN (new sessions only); GET /me on graph.instagram.com v24.0 -> username ageborn_game, account_type MEDIA_CREATOR, user_id 17841467187927379. Quota: 0 of 100 API posts per 24 h.
- The Instagram Login path (graph.instagram.com) has NO resumable/local upload: POST /{ig-user-id}/media with upload_type=resumable returns "The parameter video_url is required" (code 100) on v22-v24, for STORIES, REELS and carousel VIDEO items. Resumable upload via rupload.facebook.com belongs to the Facebook Login path (graph.facebook.com, needs a linked Facebook Page; blocked by the network policy and against the separation goal). research-tools.md was wrong on this point.
- So every image and video must sit at a public URL that Meta fetches (video_url / image_url).
- Meta fetched a PNG from raw.githubusercontent.com (rejected only for its 1.98 aspect ratio). raw.githubusercontent.com serves media with proper MIME types (checked: .m4a -> audio/mp4, nosniff), and it is reachable from the container. jsDelivr is blocked from the container.
- Proposed host (needs the owner's OK): a dedicated branch (e.g. "media") in the public game repo, files pushed just before publishing, deleted (or the orphan branch force-recreated) right after the container is FINISHED. Branch names outside main and claude/** do not trigger CI or Pages. The URL contains the GitHub user name; only Meta sees it.
- Image posts: JPEG; feed aspect ratio between 4:5 and 1.91:1; Stories and Reels 9:16.
- Test clips (ephemeral, test session scratchpad): story.mp4, reel.mp4, car1.mp4, car2.mp4, render2.py.
