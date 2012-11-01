# -*- coding: utf-8 -*-
require 'sinatra/base'
require 'fb_graph'
require 'json'

class DfmApp < Sinatra::Base

  configure do
    APP_KEY, APP_SECRET = File.open(".key").read.split
  end

  use Rack::Session::Cookie

  error do
    "sorry"
  end
  
  not_found do
    "404"
  end

  get '/' do
    erb :index
  end

  get '/auth' do
    auth = FbGraph::Auth.new APP_KEY, APP_SECRET, :redirect_uri => "#{request.scheme}://#{request.host}:#{request.port}/auth/callback"
    redirect auth.client.authorization_uri(:scope => [:email])
  end

  get '/auth/callback' do
    auth = FbGraph::Auth.new APP_KEY, APP_SECRET, :redirect_uri => "#{request.scheme}://#{request.host}:#{request.port}/auth/callback"
    client = auth.client
    client.authorization_code = params[:code]
    access_token = client.access_token! :client_auth_body
    session[:token] = access_token.access_token
    redirect '/edit'
  end
  
  get '/friends.json' do
    user = FbGraph::User.me(session[:token]).fetch
    friends = user.friends({"locale" => "ja_JP"})
    content_type :json
    friends.to_a.map{|friend|
      {"name" => friend.name, "picture" => friend.picture({"&width=" => "34", "&height=" => "34"})}
    }.to_json
  end

  get '/edit' do
    erb :edit
  end

  post '/create' do
  end
end
