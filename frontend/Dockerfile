# Use nginx as base image
FROM nginx:alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy static files
COPY ./main_page /usr/share/nginx/html/main_page
COPY ./all_members /usr/share/nginx/html/all_members
COPY ./enter_member /usr/share/nginx/html/enter_member
COPY ./scan_qr /usr/share/nginx/html/scan_qr

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"] 