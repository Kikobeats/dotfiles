#!/bin/bash

    BASEDIR=`dirname $0`
    CONFIG=$BASEDIR/configfile
    GLOBAL_SELECTOR=`cat $CONFIG`

    ###########
    # MODULES #
    # #########

    # kill all services
    stopped_service(){

        killall $1
        [[ $? -eq 0 ]] && echo " $1 was stopped."
    }

    # Redis process
    redis(){
        redis-server
    }

    # Run node-inspector with forever
    debugging(){
        if [[ $# == 0 ]]; then
            forever /usr/local/bin/node-inspector --web-port=9999
        else
            echo entramos
            forever /usr/local/bin/node-inspector --web-port=$1
        fi
    }

    # MongoDB process
    mongoDB(){
        if [[ $1 == "shell" ]]; then
            mongo
        else
            mongod
        fi
    }

    # Run node.js server with supervisor (default) or nodemon
    run_node(){

        if [[ $GLOBAL_SELECTOR == "supervisor" ]]; then
            echo "Running node.js with supervisor"
            supervisor --debug $1
        else
            # info: http://nodemon.codeplex.com/
            echo "Running node.js with nodemon"
            nodemon --debug $1
        fi
    }

    global_runtime(){
        if [[ $1 == "supervisor" ]]; then
            echo "supervisor" > $CONFIG
            echo " Now, 'supervisor' is the main script."

        elif [[ $1 == "nodemon" ]]; then
            echo "nodemon" > $CONFIG
            echo " Now, 'nodemon' is the main script."

        else
            echo "Error. command not found. Try with help command."

        fi
    }

    status(){
        echo " Basedir: $BASEDIR"
        echo " Config file: $CONFIG"
        echo " Config settings: $GLOBAL_SELECTOR"
    }

    # Mata todos los procesos asociados
    disconnect(){
        stopped_service redis-server
        stopped_service mongod
        stopped_service node
    }

    # HELP
    help_menu(){
        echo
        echo " ############## "
        echo " # NODEJS DEV # "
        echo " ############## "
        echo
        echo "  usage: nodev [option] [command] <file_name>"
        echo
        echo "  files:"
        echo "   <file_name>: Run Node.js with persistent update (with supervisor by default)"
        echo
        echo "  commands:"
        echo "   status: view global status"
        echo "   debug [port]: Run debug (forever+node-inspector). Default port: 9999"
        echo "   redis: Run REDIS"
        echo "   mongo: Run MongoDB"
        echo "   off: kill all services"
        echo
        echo "  options"
        echo "   --usage supervisor: By default supervisor is the default library"
        echo "   --usage nodemon: Use nodemon instead of supervisor"
        echo
        echo "  NOTE: with nodemon you can restart the server in any moment with 'rs' command"
        echo
    }

    ########
    # MAIN #
    ########
    REGEX=`echo $1 | grep -qx *.js`

    [[ $# == 0 ||  $1 == "help" ]] && help_menu || {

        if [[ $1 == "status" ]]; then
            status

        elif [[ $1 == "redis" ]]; then
            redis

        elif [[ $1 == "debug" ]]; then
            if [[ $# == 2 ]]; then
                echo entramos
                debugging $2
            else
                debugging
            fi

        elif [[ $1 == "mongo" ]]; then
            if [[ $# == 2 ]]; then
                mongoDB $2
            else
                mongoDB
            fi

        elif [[ $1 == "--usage" ]]; then
            global_runtime $2

        elif [[ $1 == "off" ]]; then
            disconnect

        elif [[ !$REGEX ]]; then
            run_node $1

        else
            echo $'\a'" Command not found. write '$0 help' for help"
        fi
    }