module.exports = function (grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        clean: ["db/*.db", "uploads/*.jpg"],
        less: {
            site: {
                src: ['templates/less/site.less'],
                dest: 'assets/style.css'
            }
        },
        watch: {
            files: [
                'templates/**/*.*'
            ],
            tasks: ['default']
        }
    });

    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-contrib-watch');

    // Default task(s).
    grunt.registerTask('default', ['less']);

};