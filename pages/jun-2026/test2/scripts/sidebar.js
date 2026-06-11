// sidebar.js
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebar = document.getElementById('sidebar');
sidebarToggle.addEventListener('click', function() {
    sidebar.classList.toggle('open');
});
// Optional: close sidebar when clicking outside
document.addEventListener('click', function(e) {
    if (!sidebar.contains(e.target) && !sidebarToggle.contains(e.target)) {
        sidebar.classList.remove('open');
    }
});
